
import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryListProps {
  categories: Category[];
  onChange: (cats: Category[]) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onChange }) => {
  const [newCatName, setNewCatName] = useState('');

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCatName,
      order: categories.length + 1,
      isVisible: true
    };
    onChange([...categories, newCat]);
    setNewCatName('');
  };

  const removeCategory = (id: string) => {
    if (window.confirm('Удалить категорию? Все блюда в ней останутся без категории.')) {
      onChange(categories.filter(c => c.id !== id));
    }
  };

  const toggleVisibility = (id: string) => {
    onChange(categories.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="Напр: Завтраки"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          className="flex-grow p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-medium placeholder:text-slate-300"
        />
        <button 
          onClick={addCategory}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-transform"
        >
          +
        </button>
      </div>

      <div className="grid gap-3">
        {categories.sort((a,b) => a.order - b.order).map(cat => (
          <div key={cat.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:border-blue-200 transition-colors">
            <div className="flex-grow font-black text-slate-900 uppercase tracking-tight italic">{cat.name}</div>
            <div className="flex gap-2">
              <button 
                onClick={() => toggleVisibility(cat.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${cat.isVisible ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
              >
                {cat.isVisible ? 'Видна' : 'Скрыта'}
              </button>
              <button 
                onClick={() => removeCategory(cat.id)}
                className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl font-black text-xl hover:bg-red-100 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryList;
