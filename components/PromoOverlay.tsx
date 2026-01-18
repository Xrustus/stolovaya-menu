
import React, { useEffect, useState } from 'react';
import { Promotion } from '../types';

interface PromoOverlayProps {
  promos: Promotion[];
}

const PromoOverlay: React.FC<PromoOverlayProps> = ({ promos }) => {
  const [currentPromo, setCurrentPromo] = useState<Promotion | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const activePromos = promos.filter(p => p.active);

  useEffect(() => {
    if (activePromos.length === 0) return;

    let index = 0;
    const showNextPromo = () => {
      const promo = activePromos[index];
      setCurrentPromo(promo);
      setIsVisible(true);
      
      const hideTimeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setCurrentPromo(null), 800);
      }, promo.duration * 1000);

      index = (index + 1) % activePromos.length;
      return hideTimeout;
    };

    const mainInterval = setInterval(showNextPromo, 50000);
    const firstTimeout = setTimeout(showNextPromo, 8000);

    return () => {
      clearInterval(mainInterval);
      clearTimeout(firstTimeout);
    };
  }, [activePromos.length]);

  if (!currentPromo) return null;

  return (
    <div className={`fixed bottom-20 right-20 z-[100] transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[150%] opacity-0 scale-90'}`}>
      <div className="bg-white/95 backdrop-blur-2xl rounded-[4rem] shadow-[0_64px_128px_-24px_rgba(0,0,0,0.3)] border border-white/40 overflow-hidden max-w-xl w-full flex flex-col pointer-events-auto">
        {currentPromo.imageUrl && (
          <div className="w-full h-64">
            <img src={currentPromo.imageUrl} alt={currentPromo.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600"></span>
            </span>
            <div className="text-red-600 text-sm font-black uppercase tracking-[0.3em]">
              АКЦИЯ НЕДЕЛИ
            </div>
          </div>
          <h2 className="font-header text-6xl text-slate-900 mb-6 leading-none italic uppercase">
            {currentPromo.title}
          </h2>
          <p className="text-2xl text-slate-500 leading-relaxed font-semibold">
            {currentPromo.description}
          </p>
        </div>
        <div className="h-3 bg-slate-100 w-full overflow-hidden">
          <div 
            className="h-full bg-red-600"
            style={{ 
              width: isVisible ? '0%' : '100%', 
              transition: `width ${currentPromo.duration}s linear`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PromoOverlay;
