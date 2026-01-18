
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, DishStatus, AppTheme, DishBadge } from '../types';
import { DATA_STORAGE_KEY, INITIAL_DATA, REMOTE_DATA_URL as DEFAULT_REMOTE_URL } from '../constants';
import PromoOverlay from './PromoOverlay';
import ThemeOverlay from './ThemeOverlay';

const MenuView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AppState>(INITIAL_DATA);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dataRef = useRef<AppState>(data);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncData = async () => {
      const activeRemoteUrl = localStorage.getItem('stolovaya_remote_url') || DEFAULT_REMOTE_URL;
      
      try {
        let newData: AppState | null = null;
        if (activeRemoteUrl) {
          const response = await fetch(`${activeRemoteUrl}?t=${Date.now()}`);
          if (response.ok && response.status !== 204) {
            newData = await response.json();
          }
        }

        if (!newData) {
          const saved = localStorage.getItem(DATA_STORAGE_KEY);
          if (saved) newData = JSON.parse(saved);
        }

        if (newData && newData.lastUpdated !== dataRef.current.lastUpdated) {
          setData(newData);
          dataRef.current = newData;
          localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(newData));
        }
      } catch (e) {
        console.error('Sync failed', e);
      }
    };
    syncData();
    const interval = setInterval(syncData, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let animationFrame: number;
    let timeout: any;
    let direction: 'down' | 'up' = 'down';
    let isPaused = false;

    const scroll = () => {
      if (isPaused) return;
      const scrollContainer = document.documentElement;
      const maxScroll = scrollContainer.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) {
        if (window.scrollY !== 0) window.scrollTo(0, 0);
        return;
      }
      if (direction === 'down') {
        window.scrollBy(0, 0.4);
        if (window.scrollY >= maxScroll) {
          isPaused = true;
          direction = 'up';
          timeout = setTimeout(() => { isPaused = false; }, 8000);
        }
      } else {
        window.scrollBy(0, -5);
        if (window.scrollY <= 0) {
          isPaused = true;
          direction = 'down';
          timeout = setTimeout(() => { isPaused = false; }, 8000);
        }
      }
      animationFrame = requestAnimationFrame(scroll);
    };

    timeout = setTimeout(() => {
      animationFrame = requestAnimationFrame(scroll);
    }, 5000);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(timeout);
    };
  }, [data]);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 17) return 'Приятного обеда';
    return 'Добрый вечер';
  }, [currentTime]);

  const visibleCategories = useMemo(() => 
    data.categories
      .filter(c => c.isVisible)
      .sort((a, b) => a.order - b.order)
  , [data.categories]);

  const themeStyles = {
    default: {
      bg: 'bg-[#f8fafc]',
      accent: 'bg-red-600',
      textAccent: 'text-red-600',
      gradient: 'from-red-600 to-red-800',
      cardBorder: 'border-slate-100'
    },
    'new-year': {
      bg: 'bg-gradient-to-b from-[#0f172a] to-[#1e293b]',
      accent: 'bg-blue-600',
      textAccent: 'text-cyan-400',
      gradient: 'from-blue-600 via-indigo-600 to-blue-800',
      cardBorder: 'border-blue-900/50'
    },
    spring: {
      bg: 'bg-[#fdfaff]',
      accent: 'bg-emerald-500',
      textAccent: 'text-emerald-600',
      gradient: 'from-emerald-400 to-teal-500',
      cardBorder: 'border-emerald-50'
    },
    autumn: {
      bg: 'bg-[#fffcf7]',
      accent: 'bg-orange-700',
      textAccent: 'text-orange-700',
      gradient: 'from-orange-600 to-amber-800',
      cardBorder: 'border-orange-50'
    }
  };

  const currentStyle = themeStyles[data.theme || 'default'];
  const isDark = data.theme === 'new-year';

  const renderBadge = (badge: DishBadge) => {
    switch (badge) {
      case 'new': return <span className="bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ml-3">Новинка</span>;
      case 'hit': return <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ml-3">Хит</span>;
      case 'spicy': return <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ml-3">Острое</span>;
      case 'vegan': return <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ml-3">Веган</span>;
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen theme-transition p-12 pb-40 ${currentStyle.bg}`}>
      <ThemeOverlay theme={data.theme || 'default'} />

      <header className={`flex justify-between items-end mb-16 relative z-10 border-b-4 ${isDark ? 'border-white/10' : 'border-slate-200'} pb-10`}>
        <div className="flex items-center gap-8">
          <div className={`w-32 h-32 ${isDark ? 'bg-white' : 'bg-red-600'} rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-3`}>
            <span className={`font-header text-6xl italic ${isDark ? 'text-blue-900' : 'text-white'}`}>№1</span>
          </div>
          <div>
            <h1 className={`font-header text-9xl tracking-tight uppercase italic leading-none mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Столовая
            </h1>
            <p className={`text-2xl font-bold tracking-[0.2em] uppercase ${isDark ? 'text-blue-300' : 'text-slate-400'}`}>
              Вкусно <span className="mx-2 opacity-30">•</span> Полезно <span className="mx-2 opacity-30">•</span> По-домашнему
            </p>
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/admin')}
          className={`${isDark ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-slate-900 shadow-2xl'} p-8 rounded-[2.5rem] text-center min-w-[320px] cursor-pointer transition-transform active:scale-95 group`}
        >
          <div className={`text-[12px] font-black uppercase tracking-[0.4em] mb-2 transition-colors ${isDark ? 'text-cyan-400' : 'text-red-500'}`}>
            {greeting}!
          </div>
          <div className={`text-7xl font-black tabular-nums leading-none ${isDark ? 'text-white' : 'text-white'}`}>
            {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className={`text-lg font-bold uppercase tracking-widest mt-3 ${isDark ? 'text-blue-200' : 'text-slate-400'}`}>
            {currentTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
        {visibleCategories.map(cat => {
          const catDishes = data.dishes
            .filter(d => d.category === cat.id && d.status !== DishStatus.HIDDEN)
            .sort((a, b) => a.order - b.order);

          if (catDishes.length === 0) return null;

          return (
            <section key={cat.id} className={`${isDark ? 'bg-white/5 backdrop-blur-xl' : 'bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]'} rounded-[4rem] overflow-hidden border ${currentStyle.cardBorder}`}>
              <div className={`bg-gradient-to-r ${currentStyle.gradient} p-10`}>
                <h2 className="font-header text-5xl text-white uppercase tracking-widest italic">{cat.name}</h2>
              </div>
              <div className="p-12 space-y-12">
                {catDishes.map(dish => (
                  <div key={dish.id} className={`flex gap-10 items-center border-b ${isDark ? 'border-white/5' : 'border-slate-50'} pb-10 last:border-0 last:pb-0 relative ${dish.status === DishStatus.SOLD_OUT ? 'opacity-50' : ''}`}>
                    {dish.imageUrl && (
                      <div className="w-56 h-40 flex-shrink-0 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/10 relative">
                        <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
                        {dish.status === DishStatus.SOLD_OUT && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="border-4 border-red-500 text-red-500 font-black px-4 py-1 rounded-xl rotate-[-20deg] uppercase text-2xl">ЗАКОНЧИЛОСЬ</div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div className="flex-grow pr-6">
                          <h3 className={`text-4xl font-extrabold tracking-tight leading-tight mb-2 flex items-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {dish.name}
                            {renderBadge(dish.badge)}
                          </h3>
                          <p className={`text-xl font-medium leading-relaxed italic ${isDark ? 'text-blue-200/50' : 'text-slate-400'}`}>
                            {dish.description}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          {dish.discountPrice ? (
                            <>
                              <span className={`text-2xl line-through font-bold mb-1 ${isDark ? 'text-white/20' : 'text-slate-300'}`}>
                                {dish.price} ₽
                              </span>
                              <span className={`text-5xl font-black tracking-tighter ${isDark ? 'text-cyan-400' : 'text-red-600'}`}>
                                {dish.discountPrice} ₽
                              </span>
                            </>
                          ) : (
                            <span className={`text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {dish.price} ₽
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <PromoOverlay promos={data.promotions} />

      <footer className="mt-28 py-16 border-t border-slate-200/10 text-center relative z-10">
        <p className={`text-3xl font-black uppercase tracking-[0.3em] ${isDark ? 'text-blue-100/30' : 'text-slate-300'}`}>
          {data.footerMessage || INITIAL_DATA.footerMessage}
        </p>
      </footer>
    </div>
  );
};

export default MenuView;
