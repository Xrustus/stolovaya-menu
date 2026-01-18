
import React, { useState } from 'react';
import { Promotion } from '../types';

interface PromoManagerProps {
  promos: Promotion[];
  onChange: (promos: Promotion[]) => void;
}

const PromoManager: React.FC<PromoManagerProps> = ({ promos, onChange }) => {
  const [isEditing, setIsEditing] = useState<Partial<Promotion> | null>(null);

  const handleSave = () => {
    if (!isEditing?.title) return;
    const exists = promos.find(p => p.id === isEditing.id);
    const updated = exists 
      ? promos.map(p => p.id === isEditing.id ? { ...p, ...isEditing } as Promotion : p)
      : [...promos, { ...isEditing, id: Math.random().toString(36).substr(2, 9), active: true, frequency: 60, duration: 10 } as Promotion];
    
    onChange(updated);
    setIsEditing(null);
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setIsEditing({ title: '', description: '', animationStyle: 'slide-up' })}
        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
      >
        + Создать акцию
      </button>

      <div className="grid gap-4">
        {promos.map(promo => (
          <div key={promo.id} className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg text-slate-900">{promo.title}</h4>
                <p className="text-sm text-slate-500">{promo.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={promo.active}
                  onChange={e => onChange(promos.map(p => p.id === promo.id ? { ...p, active: e.target.checked } : p))}
                  className="w-5 h-5"
                />
                <button 
                  onClick={() => setIsEditing(promo)}
                  className="text-blue-600 font-bold px-2"
                >
                  ✎
                </button>
                <button 
                  onClick={() => onChange(promos.filter(p => p.id !== promo.id))}
                  className="text-red-500 font-bold px-2"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 p-4 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-bold">Настройка акции</h3>
            <input 
              type="text" 
              placeholder="Заголовок"
              value={isEditing.title}
              onChange={e => setIsEditing({ ...isEditing, title: e.target.value })}
              className="w-full p-3 border rounded-xl outline-none"
            />
            <textarea 
              placeholder="Описание"
              value={isEditing.description}
              onChange={e => setIsEditing({ ...isEditing, description: e.target.value })}
              className="w-full p-3 border rounded-xl outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500">Частота (сек)</label>
                <input 
                  type="number" 
                  value={isEditing.frequency}
                  onChange={e => setIsEditing({ ...isEditing, frequency: Number(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Длительность (сек)</label>
                <input 
                  type="number" 
                  value={isEditing.duration}
                  onChange={e => setIsEditing({ ...isEditing, duration: Number(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(null)} className="flex-1 py-3 text-slate-500 font-bold">Отмена</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Ок</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoManager;
