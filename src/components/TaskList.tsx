
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { ChevronDown, Calendar, Pencil, Check, RotateCcw, Trash2 } from 'lucide-react';
import { db } from '@/services/firebase';
import { Task, Category } from '@/types';
import { parseLocalDate, formatLocalDate } from '@/utils/dateUtils';

interface Props {
  categories: Category[];
  showArchived: boolean;
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<Props> = ({ categories, showArchived, onEditTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = query(
      collection(db, 'tasks'), 
      where('isArchived', '==', showArchived)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksArray: Task[] = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      
      tasksArray.sort((a, b) => {
        // If one has no deadline, put it at the end
        if (!a.deadline && !b.deadline) return (a.createdAt || 0) - (b.createdAt || 0);
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        
        // Compare dates
        const dateA = parseLocalDate(a.deadline)?.getTime() || 0;
        const dateB = parseLocalDate(b.deadline)?.getTime() || 0;
        
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        
        // Secondary sort by createdAt if dates are same
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

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

  const toggleTaskExpansion = (id: string) => {
    const newSet = new Set(expandedTasks);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedTasks(newSet);
  };

  const getTaskStatusColor = (deadline: string) => {
    const dueDate = parseLocalDate(deadline);
    if (!dueDate) return '#10b981'; // Green (No due date)
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 7) return '#10b981'; // Green
    if (diffDays >= 4) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red (3 or less, or overdue)
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
          <div key={cat.id} className="overflow-hidden">
            <button
              onClick={() => toggleCategory(cat.id)}
              className="flex items-center justify-between w-full p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-r-4 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all mb-2 rounded-2xl group"
              style={{ borderRightColor: cat.color }}
            >
              <div className="flex items-center gap-3">
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors"
                  style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                >
                  {catTasks.length}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
              </div>
              <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} />
              </span>
            </button>

            {isOpen && (
              <ul className="space-y-3 ps-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                {catTasks.map((task) => {
                  const isExpanded = expandedTasks.has(task.id);
                  const statusColor = getTaskStatusColor(task.deadline);

                  return (
                    <li
                      key={task.id}
                      onClick={() => toggleTaskExpansion(task.id)}
                      className={`group flex flex-col p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-gray-100 dark:border-slate-700 rounded-[1.5rem] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all relative cursor-pointer overflow-hidden ${!showArchived ? '' : ''}`}
                    >
                      {/* Status Line at Bottom */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-1" 
                        style={{ backgroundColor: statusColor }}
                      />

                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div className="flex-grow">
                          <p className={`font-medium text-base leading-snug break-words ${task.isArchived ? 'line-through text-gray-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                            {task.title}
                          </p>
                          {task.deadline && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 font-medium">
                              <Calendar size={14} className="text-blue-500 dark:text-blue-400" />
                              {formatLocalDate(task.deadline)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-slate-300 dark:text-slate-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown size={18} />
                          </span>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={(e) => handleEditClick(e, task)} 
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                              title="עריכת משימה"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={(e) => toggleArchive(e, task.id, task.isArchived)} 
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                              title={task.isArchived ? "שחזור משימה" : "סימון כבוצע"}
                            >
                              {task.isArchived ? <RotateCcw size={16} /> : <Check size={16} />}
                            </button>
                            <button 
                              onClick={(e) => deleteTask(e, task.id)} 
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                              title="מחיקה סופית"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 duration-200 pb-2">
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap text-right">
                            {task.description || 'אין תיאור למשימה זו.'}
                          </p>
                        </div>
                      )}
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
