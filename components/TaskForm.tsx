
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Category, Task } from '../types';
import IconSelector from './IconSelector';
import * as Lucide from 'lucide-react';

const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899', '#0ea5e9', '#d946ef'];

interface Props {
  onSuccess?: () => void;
  initialTask?: Task;
  categories: Category[];
}

const TaskForm: React.FC<Props> = ({ onSuccess, initialTask, categories }) => {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialTask?.categoryId || (categories.length > 0 ? categories[0].id : 'default'));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isNewCategoryMode, setIsNewCategoryMode] = useState(false);
  const [deadline, setDeadline] = useState(initialTask?.deadline || '');
  const [color, setColor] = useState(initialTask?.color || '#3b82f6');
  const [icon, setIcon] = useState(initialTask?.icon || '✅');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setSelectedCategoryId(initialTask.categoryId);
      setDeadline(initialTask.deadline);
      setColor(initialTask.color);
      setIcon(initialTask.icon);
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
            color: color,
            order: categories.length
          });
          categoryIdToUse = catRef.id;
        }
      }

      const taskData = {
        title: title.trim(),
        categoryId: categoryIdToUse || 'default',
        deadline,
        color,
        icon,
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
        <label className="block text-sm font-bold text-slate-700 mb-2 text-right">תיאור המשימה</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="מה צריך לעשות?"
          className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right font-bold text-lg"
          disabled={isSubmitting}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider text-right">קטגוריה</label>
          {!isNewCategoryMode ? (
            <div className="flex gap-2">
              <select 
                value={selectedCategoryId} 
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="flex-grow px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-right"
              >
                <option value="default">ללא קטגוריה</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button 
                type="button" 
                onClick={() => setIsNewCategoryMode(true)}
                className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-100"
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
                className="flex-grow px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-right"
                autoFocus
              />
              <button 
                type="button" 
                onClick={() => setIsNewCategoryMode(false)}
                className="p-3 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"
                title="ביטול"
              >
                <Lucide.XCircle size={24} />
              </button>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider text-right">דדליין</label>
          <input 
            type="date" 
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider text-right">בחר צבע עבור האייקון</label>
        <div className="flex flex-wrap gap-3 justify-end">
          {colors.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-10 h-10 rounded-full border-4 transition-all ${color === c ? 'scale-110 border-white ring-4 ring-slate-200 shadow-md' : 'border-transparent hover:scale-110 shadow-sm'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider text-right">בחר אימוג'י</label>
        <IconSelector selected={icon} onSelect={setIcon} color={color} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim() || (isNewCategoryMode && !newCategoryName.trim())}
        className="w-full py-5 bg-blue-600 text-white font-black text-xl rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-2xl shadow-blue-500/30 hover:-translate-y-1 active:translate-y-0"
      >
        {isSubmitting ? 'שומר...' : initialTask ? 'עדכן משימה' : 'צור משימה'}
      </button>
    </form>
  );
};

export default TaskForm;
