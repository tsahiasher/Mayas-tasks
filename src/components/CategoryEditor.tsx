
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { db } from '../services/firebase';
import { Category } from '../types';

interface Props {
  categories: Category[];
}

// Sub-component for individual category row to handle local state and prevent re-render lag
const CategoryRow: React.FC<{ 
  cat: Category; 
  onUpdate: (id: string, name: string, color: string) => void; 
  onDelete: (id: string) => void;
}> = ({ cat, onUpdate, onDelete }) => {
  const [localName, setLocalName] = useState(cat.name);

  // Sync local name if prop changes from outside (e.g., Firestore update)
  useEffect(() => {
    setLocalName(cat.name);
  }, [cat.name]);

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl group shadow-sm transition-all hover:border-gray-200 dark:hover:border-slate-600">
      <input 
        type="color" 
        value={cat.color} 
        onChange={e => onUpdate(cat.id, localName, e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0 overflow-hidden shrink-0"
      />
      <input 
        value={localName} 
        onChange={e => setLocalName(e.target.value)}
        onBlur={() => {
          if (localName !== cat.name) {
            onUpdate(cat.id, localName, cat.color);
          }
        }}
        className="bg-transparent border-none text-sm font-semibold w-full focus:ring-0 outline-none text-right dark:text-white"
        placeholder="שם קטגוריה..."
      />
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(cat.id);
        }}
        className="p-1.5 text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0"
        title="מחיקת קטגוריה"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

const CategoryEditor: React.FC<Props> = ({ categories }) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899'];

  const addCategory = async () => {
    if (!newName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newName.trim(),
        color: newColor,
        order: categories.length
      });
      setNewName('');
    } catch (err) {
      console.error("Failed to add category:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, name: string, color: string) => {
    try {
      await updateDoc(doc(db, 'categories', id), { name, color });
    } catch (err) {
      console.error("Failed to update category:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('בטוח שברצונך למחוק קטגוריה זו? כל המשימות המשויכות אליה יימחקו לצמיתות!')) {
      try {
        const batch = writeBatch(db);
        
        // 1. Find all tasks belonging to this category
        const tasksQuery = query(collection(db, 'tasks'), where('categoryId', '==', id));
        const tasksSnapshot = await getDocs(tasksQuery);
        
        // 2. Add them to the batch deletion
        tasksSnapshot.forEach((taskDoc) => {
          batch.delete(taskDoc.ref);
        });
        
        // 3. Delete the category itself
        batch.delete(doc(db, 'categories', id));
        
        // 4. Commit the batch
        await batch.commit();
      } catch (err) {
        console.error("Failed to delete category and tasks:", err);
        alert("שגיאה במחיקת הקטגוריה והמשימות. וודא שיש לך הרשאות מתאימות.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Category Section */}
      <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">הוספת קטגוריה</label>
        <div className="flex flex-col gap-3">
          <input 
            value={newName} 
            onChange={e => setNewName(e.target.value)}
            placeholder="שם קטגוריה חדשה..."
            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right dark:text-white"
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-1.5">
              {colors.map(c => (
                <button 
                  key={c} 
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-slate-200 dark:ring-slate-700' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button 
              type="button"
              onClick={addCategory}
              disabled={!newName.trim() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              {isSubmitting ? 'מוסיף...' : 'הוסף'}
            </button>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">קטגוריות קיימות</label>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {categories.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8 italic bg-white/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
              אין קטגוריות עדיין.
            </p>
          ) : (
            categories.map(cat => (
              <CategoryRow 
                key={cat.id} 
                cat={cat} 
                onUpdate={handleUpdate} 
                onDelete={handleDelete} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryEditor;
