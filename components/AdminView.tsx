
import React, { useState, useEffect } from 'react';
import { AppState, Category, Dish, AppTheme } from '../types';
import { AUTH_TOKEN_STORAGE_KEY, DATA_STORAGE_KEY, INITIAL_DATA, REMOTE_DATA_URL as DEFAULT_REMOTE_URL } from '../constants';
import DishForm from './DishForm';
import CategoryList from './CategoryList';
import PromoManager from './PromoManager';

const AdminView: React.FC = () => {
  const [data, setData] = useState<AppState>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'dishes' | 'categories' | 'promos' | 'settings'>('dishes');
  const [editingDish, setEditingDish] = useState<Dish | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState(localStorage.getItem('stolovaya_remote_url') || DEFAULT_REMOTE_URL);

  useEffect(() => {
    const loadData = async () => {
      // Try to load from remote first if URL is set
      if (remoteUrl) {
        try {
          const res = await fetch(`${remoteUrl}?t=${Date.now()}`);
          if (res.ok && res.status !== 204) {
            const remoteData = await res.json();
            setData(remoteData);
            localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(remoteData));
            return;
          }
        } catch (e) {
          console.warn('Could not load from remote, falling back to local storage');
        }
      }

      const saved = localStorage.getItem(DATA_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed);
      }
    };
    loadData();
  }, [remoteUrl]);

  const updateDraft = (newData: AppState) => {
    setData(newData);
    try {
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(newData));
    } catch (error) {
      console.warn('Failed to persist draft in localStorage', error);
    }
    setHasUnsavedChanges(true);
  };

  const handlePublish = async () => {
    if (!remoteUrl) {
      alert('Для синхронизации с ТВ укажите URL сервера в настройках!');
      setActiveTab('settings');
      return;
    }
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      alert('Сессия истекла. Войдите в админку заново.');
      window.location.reload();
      return;
    }

    setIsPublishing(true);
    const publishedData = { ...data, lastUpdated: Date.now() };

    try {
      // Logic for saving to your server
      const response = await fetch(remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(publishedData)
      });
      
      if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        alert('Нет доступа. Войдите в админку заново.');
        window.location.reload();
        return;
      }
      if (!response.ok) throw new Error('Server error');
      
      setData(publishedData);
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(publishedData));
      setHasUnsavedChanges(false);
      alert('Успешно опубликовано! Меню на ТВ обновится в течение 30 секунд.');
    } catch (e) {
      alert('Ошибка связи с сервером. Проверьте URL в настройках.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDish = (dish: Dish) => {
    const exists = data.dishes.find(d => d.id === dish.id);
    const newDishes = exists
      ? data.dishes.map(d => d.id === dish.id ? dish : d)
      : [...data.dishes, dish];
    
    updateDraft({ ...data, dishes: newDishes });
    setIsFormOpen(false);
    setEditingDish(undefined);
  };

  const handleDeleteDish = (dish: Dish) => {
    const confirmed = window.confirm(`Удалить блюдо "${dish.name}"?`);
    if (!confirmed) return;
    const newDishes = data.dishes.filter(d => d.id !== dish.id);
    updateDraft({ ...data, dishes: newDishes });
    if (editingDish?.id === dish.id) {
      setIsFormOpen(false);
      setEditingDish(undefined);
    }
  };

  const handleSaveRemoteUrl = (url: string) => {
    setRemoteUrl(url);
    localStorage.setItem('stolovaya_remote_url', url);
  };

  const themes: { id: AppTheme; label: string; icon: string }[] = [
    { id: 'default', label: 'Стандарт', icon: '🍽️' },
    { id: 'new-year', label: 'Новый год', icon: '❄️' },
    { id: 'spring', label: 'Весна', icon: '🌸' },
    { id: 'autumn', label: 'Осень', icon: '🍂' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 pb-32">
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 uppercase italic">Админ <span className="text-red-600">№1</span></h1>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
              window.location.reload();
            }}
            className="text-xs text-slate-400 font-bold uppercase tracking-tight"
          >
            Выход
          </button>
        </div>
        <nav className="flex gap-1">
          {[{ id: 'dishes', label: 'Блюда' }, { id: 'categories', label: 'Кат.' }, { id: 'promos', label: 'Акции' }, { id: 'settings', label: '⚙️' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-500 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-4 right-4 z-40">
          <button onClick={handlePublish} disabled={isPublishing} className="w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95">
            {isPublishing ? 'Публикация...' : '🚀 Обновить меню на ТВ'}
          </button>
        </div>
      )}

      <main className="p-4 max-w-2xl mx-auto">
        {activeTab === 'dishes' && (
          <div className="space-y-4">
            <button onClick={() => { setEditingDish(undefined); setIsFormOpen(true); }} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl">
              + Добавить блюдо
            </button>
            <div className="space-y-8">
              {data.categories.map(cat => {
                const catDishes = data.dishes.filter(d => d.category === cat.id);
                if (catDishes.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-3">
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-3">
                      <span className="w-8 h-1 bg-red-600 rounded-full" /> {cat.name}
                    </h3>
                    <div className="grid gap-3">
                      {catDishes.map(dish => (
                        <div key={dish.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border">
                            {dish.imageUrl ? <img src={dish.imageUrl} className="w-full h-full object-cover" /> : null}
                          </div>
                          <div className="flex-grow">
                            <div className="font-bold text-slate-900 text-sm">{dish.name}</div>
                            <div className="text-red-600 font-black text-xs">{dish.discountPrice || dish.price} ₽</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingDish(dish); setIsFormOpen(true); }}
                              className="p-2 bg-slate-100 rounded-lg text-slate-600"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteDish(dish)}
                              className="p-2 bg-red-50 rounded-lg text-red-600"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'categories' && <CategoryList categories={data.categories} onChange={(cats) => updateDraft({ ...data, categories: cats })} />}
        {activeTab === 'promos' && <PromoManager promos={data.promotions} onChange={(promos) => updateDraft({ ...data, promotions: promos })} />}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h2 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter">Синхронизация с ТВ</h2>
              <div className="mb-8">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">URL сервера (API)</label>
                <input 
                  type="url" 
                  value={remoteUrl}
                  placeholder="https://your-server.com/api/menu"
                  onChange={(e) => handleSaveRemoteUrl(e.target.value)}
                  className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 text-slate-900 text-sm mb-2"
                />
                <p className="text-[9px] text-slate-400 leading-tight">Этот URL используется для передачи данных между вашим телефоном и телевизором.</p>
              </div>

              <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tighter">Оформление</h2>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => updateDraft({ ...data, theme: t.id })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                      data.theme === t.id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <span className="text-3xl">{t.icon}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${data.theme === t.id ? 'text-blue-600' : 'text-slate-400'}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>

              <h2 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tighter">Текст внизу</h2>
              <textarea 
                value={data.footerMessage}
                onChange={(e) => updateDraft({ ...data, footerMessage: e.target.value })}
                className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 text-slate-900 text-sm"
                rows={3}
              />
            </div>
          </div>
        )}
      </main>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md p-4 flex items-end justify-center overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-8 shadow-2xl">
            <DishForm categories={data.categories} initialData={editingDish} onSave={handleSaveDish} onCancel={() => setIsFormOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
