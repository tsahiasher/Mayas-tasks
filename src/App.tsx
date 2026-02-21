
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Image, Settings, Archive, X, Plus } from 'lucide-react';
import { db } from '@/services/firebase';
import { Category, Task } from '@/types';
import TaskForm from '@/components/TaskForm';
import TaskList from '@/components/TaskList';
import CategoryEditor from '@/components/CategoryEditor';
import Auth from '@/components/Auth';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bgImage, setBgImage] = useState<string>(localStorage.getItem('app-bg') || '');
  const [showBgInput, setShowBgInput] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    // Categories listener
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribeCats = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category)));
    });

    // Theme/Background listener for cross-device persistence
    const unsubscribeTheme = onSnapshot(doc(db, 'settings', 'theme'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const url = data?.bgImage;
        if (url !== undefined) {
          setBgImage(url);
          localStorage.setItem('app-bg', url);
        }
      }
    });

    return () => {
      unsubscribeCats();
      unsubscribeTheme();
    };
  }, []);

  // Automatic cleanup for old archived tasks
  useEffect(() => {
    const cleanupOldTasks = async () => {
      try {
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const q = query(
          collection(db, 'tasks'), 
          where('isArchived', '==', true)
        );
        
        const snapshot = await getDocs(q);
        const deletePromises: Promise<void>[] = [];
        
        snapshot.forEach((taskDoc) => {
          const data = taskDoc.data() as Task;
          if (data.deadline) {
            const dueDate = new Date(data.deadline);
            if (dueDate < twoMonthsAgo) {
              deletePromises.push(deleteDoc(doc(db, 'tasks', taskDoc.id)));
            }
          }
        });
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      } catch (err) {
        console.error("Error during auto-cleanup:", err);
      }
    };

    // Run cleanup once on mount
    cleanupOldTasks();
  }, []);

  const handleBgChange = async (url: string) => {
    setBgImage(url);
    localStorage.setItem('app-bg', url);
    setShowBgInput(false);
    
    // Persist to Firestore
    try {
      await setDoc(doc(db, 'settings', 'theme'), { bgImage: url }, { merge: true });
    } catch (err) {
      console.error("Error saving theme settings:", err);
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  return (
    <Auth>
      <div 
        className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 transition-all duration-700 bg-cover bg-center bg-no-repeat bg-fixed dark:bg-slate-900" 
        dir="rtl"
        style={{ 
          backgroundImage: bgImage ? `url("${bgImage}")` : 'none',
          backgroundColor: bgImage ? 'transparent' : undefined
        }}
      >
        {bgImage && <div className="fixed inset-0 bg-slate-900/25 dark:bg-slate-950/40 pointer-events-none backdrop-blur-[1px]"></div>}
        
        <div className="max-w-xl mx-auto relative z-10">
          {/* Header Navigation / Controls */}
          <div className="flex justify-between items-center mb-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-2 rounded-2xl border border-white/30 dark:border-slate-700/30 shadow-sm">
            <div className="flex gap-2">
              <button 
                onClick={() => setShowBgInput(!showBgInput)}
                className={`p-2.5 rounded-xl shadow-sm transition-all ${
                  showBgInput ? 'bg-blue-600 text-white' : 'bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                title="שנה רקע"
              >
                <Image size={20} />
              </button>
              <button 
                onClick={() => setShowCategoryModal(true)}
                className="p-2.5 bg-white/80 dark:bg-slate-700/80 rounded-xl shadow-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                title="ניהול קטגוריות"
              >
                <Settings size={20} />
              </button>
            </div>

            <div className="flex gap-2 text-lg font-semibold text-slate-800 dark:text-white tracking-tight hidden sm:block">
               המשימות של מאיה
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${
                  showArchived 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600'
                }`}
              >
                <Archive size={18} />
                {showArchived ? 'משימות פעילות' : 'ארכיון'}
              </button>
            </div>
          </div>

          {showBgInput && (
            <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
              <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg p-5 rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 space-y-3">
                 <div className="flex justify-between items-center mb-1">
                   <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">הגדרת רקע מותאם אישית</h3>
                   <button onClick={() => setShowBgInput(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <X size={18} />
                   </button>
                 </div>
                 
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="bg-url-input"
                      placeholder="הדבק כתובת URL של תמונה..." 
                      className="flex-grow px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                      defaultValue={bgImage}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleBgChange((e.target as HTMLInputElement).value);
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('bg-url-input') as HTMLInputElement;
                        if (input) handleBgChange(input.value);
                      }}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                    >
                      עדכן
                    </button>
                 </div>

                 <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
                   <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                     <strong>טיפ:</strong> להצגת תמונה מ-Google Photos, לחצו מקש ימני על התמונה ובחרו "העתק כתובת תמונה".
                   </p>
                 </div>

                 <button 
                  onClick={() => handleBgChange('')}
                  className="w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-dashed border-red-200 dark:border-red-900/40"
                >
                  הסרת רקע
                </button>
              </div>
            </div>
          )}

          <main className="pb-24">
            <TaskList categories={categories} showArchived={showArchived} onEditTask={openEditTask} />
          </main>

          {/* Modal: Add/Edit Task */}
          {showTaskModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    {editingTask ? 'עריכת משימה' : 'הוספת משימה חדשה'}
                  </h2>
                  <button onClick={closeTaskModal} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <TaskForm 
                    onSuccess={closeTaskModal} 
                    initialTask={editingTask || undefined} 
                    categories={categories}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal: Manage Categories */}
          {showCategoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">ניהול קטגוריות</h2>
                  <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <CategoryEditor categories={categories} />
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          {!showTaskModal && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="fixed bottom-8 left-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-500/40 hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-40 group"
            >
              <Plus size={32} />
            </button>
          )}
        </div>
      </div>
    </Auth>
  );
};

export default App;