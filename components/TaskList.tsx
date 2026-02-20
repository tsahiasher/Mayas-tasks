
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Task, Category } from '../types';
import * as Lucide from 'lucide-react';

interface Props {
  categories: Category[];
  showArchived: boolean;
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<Props> = ({ categories, showArchived, onEditTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'tasks'), 
      where('isArchived', '==', showArchived)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksArray: Task[] = (querySnapshot as any).docs.map((d: any) => ({ id: d.id, ...d.data() } as Task));
      tasksArray.sort((a, b) => (a.order || 0) - (b.order || 0));
      setTasks(tasksArray);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showArchived]);

  const deleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('למחוק את המשימה לתמיד?')) {
      await deleteDoc(doc(db, 'tasks', id));
    }
  };

  const toggleArchive = async (e: React.MouseEvent, id: string, currentState: boolean) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'tasks', id), { isArchived: !currentState });
  };

  const handleEditClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onEditTask(task);
  };

  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedCategories(newSet);
  };

  const onDragStart = (id: string) => setDraggedTaskId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const onDrop = async (categoryId: string, targetOrderId: number) => {
    if (!draggedTaskId) return;
    const taskDoc = doc(db, 'tasks', draggedTaskId);
    await updateDoc(taskDoc, { 
      categoryId: categoryId,
      order: targetOrderId - 1
    });
    setDraggedTaskId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  const groupedTasks = tasks.reduce((acc, task) => {
    const catId = task.categoryId || 'default';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const displayCategories = [
    { id: 'default', name: 'ללא קטגוריה', color: '#94a3b8' },
    ...categories.map(c => ({ id: c.id, name: c.name, color: c.color }))
  ];

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 text-slate-500 font-medium">
        {showArchived ? 'אין משימות בארכיון.' : 'אין משימות פעילות. לחץ על ה- + כדי להוסיף!'}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {displayCategories.map((cat) => {
        const catTasks = groupedTasks[cat.id] || [];
        if (catTasks.length === 0 && cat.id === 'default') return null;
        
        const isOpen = expandedCategories.has(cat.id);
        
        return (
          <div key={cat.id} 
            onDragOver={onDragOver} 
            onDrop={() => onDrop(cat.id, Date.now())}
            className="overflow-hidden"
          >
            <button
              onClick={() => toggleCategory(cat.id)}
              className="flex items-center justify-between w-full p-4 bg-white/70 backdrop-blur-md border-r-4 shadow-sm hover:bg-white transition-all mb-2 rounded-2xl group"
              style={{ borderRightColor: cat.color }}
            >
              <div className="flex items-center gap-3">
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors"
                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                >
                  {catTasks.length}
                </span>
                <span className="font-bold text-slate-800">{cat.name}</span>
              </div>
              <Lucide.ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <ul className="space-y-3 ps-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                {catTasks.map((task) => {
                  const taskColor = task.color || cat.color;
                  const iconBg = task.isArchived ? '#cbd5e1' : taskColor;
                  // Handle legacy icons that might be Lucide component names by falling back to a default emoji
                  const isEmoji = task.icon && task.icon.length <= 4; 
                  const displayIcon = isEmoji ? task.icon : '📝';

                  return (
                    <li
                      key={task.id}
                      draggable={!showArchived}
                      onDragStart={() => onDragStart(task.id)}
                      className={`group flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all relative ${!showArchived ? 'cursor-move' : ''}`}
                    >
                      <div className="flex items-center gap-4 truncate">
                        <div 
                          className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-3 text-2xl" 
                          style={{ 
                            backgroundColor: iconBg, 
                            boxShadow: task.isArchived ? 'none' : `0 8px 16px -4px ${taskColor}40`
                          }}
                        >
                          {displayIcon}
                        </div>
                        <div className="truncate">
                          <p className={`font-bold text-lg truncate leading-tight ${task.isArchived ? 'line-through text-gray-400' : 'text-slate-800'}`}>
                            {task.title}
                          </p>
                          {task.deadline && (
                            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5 font-medium">
                              <Lucide.Calendar size={12} className="text-blue-400" />
                              {new Date(task.deadline).toLocaleDateString('he-IL')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 pr-2">
                        <button 
                          onClick={(e) => handleEditClick(e, task)} 
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                          title="עריכת משימה"
                        >
                          <Lucide.Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => toggleArchive(e, task.id, task.isArchived)} 
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                          title={task.isArchived ? "שחזור משימה" : "סימון כבוצע"}
                        >
                          {task.isArchived ? <Lucide.RotateCcw size={18} /> : <Lucide.CheckCircle2 size={18} />}
                        </button>
                        <button 
                          onClick={(e) => deleteTask(e, task.id)} 
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="מחיקה סופית"
                        >
                          <Lucide.Trash2 size={18} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
