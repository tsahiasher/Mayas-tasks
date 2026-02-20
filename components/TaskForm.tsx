
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Category, Task } from '../types';
import * as Lucide from 'lucide-react';

const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899', '#0ea5e9', '#d946ef'];

interface Props {
  onSuccess?: () => void;
  initialTask?: Task;
  categories: Category[];
}

const TaskForm: React.FC<Props> = ({ onSuccess, initialTask, categories }) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialTask?.categoryId || (categories.length > 0 ? categories[0].id : 'default'));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  const [deadline, setDeadline] = useState(initialTask?.deadline || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setSelectedCategoryId(initialTask.categoryId);
      setDeadline(initialTask.deadline);
    }
  }, [initialTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    if (isNewCategoryMode && !newCategoryName.trim()) return;

    setIsSubmitting(true);
    try {
      let categoryIdToUse = selectedCategoryId;

      if (isNewCategoryMode) {
        const trimmedName = newCategoryName.trim();
        const existing = categories.find(c => c.name === trimmedName);
        if (existing) {
          categoryIdToUse = existing.id;
        } else {
          const catRef = await addDoc(collection(db, 'categories'), {
            name: trimmedName,
            color: '#3b82f6', // Default color for new category
            order: categories.length
          });
          categoryIdToUse = catRef.id;
        }
      }

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryIdToUse || 'default',
        deadline,
        isArchived: initialTask?.isArchived || false,
        order: initialTask?.order || Date.now(),
        updatedAt: Date.now(),
      };

      if (initialTask) {
        await updateDoc(doc(db, 'tasks', initialTask.id), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          createdAt: Date.now(),
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving task: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 text-right">כותרת המשימה</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="מה צריך לעשות?"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right font-medium text-base dark:text-white"
          disabled={isSubmitting}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 text-right">תיאור (אופציונלי)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="פרטים נוספים..."
          rows={3}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right text-sm resize-none dark:text-white"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider text-right">קטגוריה</label>
          {!isNewCategoryMode ? (
            <div className="flex gap-2">
              <select 
                value={selectedCategoryId} 
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="flex-grow px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-right dark:text-white"
              >
                <option value="default">ללא קטגוריה</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button 
                type="button" 
                onClick={() => setIsNewCategoryMode(true)}
                className="p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors border border-blue-100 dark:border-blue-900/50"
                title="קטגוריה חדשה"
              >
                <Lucide.PlusCircle size={24} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="שם קטגוריה חדשה..."
                className="flex-grow px-3 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-right dark:text-white"
                autoFocus
              />
              <button 
                type="button" 
                onClick={() => setIsNewCategoryMode(false)}
                className="p-3 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title="ביטול"
              >
                <Lucide.XCircle size={24} />
              </button>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wider text-right">דדליין</label>
          <input 
            type="date" 
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium dark:text-white"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim() || (isNewCategoryMode && !newCategoryName.trim())}
        className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
      >
        {isSubmitting ? 'שומר...' : initialTask ? 'עדכן משימה' : 'צור משימה'}
      </button>
    </form>
  );
};

export default TaskForm;
