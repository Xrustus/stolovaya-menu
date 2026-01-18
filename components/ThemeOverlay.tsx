
import React, { useMemo } from 'react';
import { AppTheme } from '../types';

interface ThemeOverlayProps {
  theme: AppTheme;
}

const ThemeOverlay: React.FC<ThemeOverlayProps> = ({ theme }) => {
  if (theme === 'default') return null;

  // Stable particle configuration to prevent "jumping" during data updates
  const particles = useMemo(() => {
    const layers = [
      { count: 10, speedBase: 12, sizeBase: 35, blur: 0, opacity: 0.8 }, // Close
      { count: 15, speedBase: 25, sizeBase: 25, blur: 1, opacity: 0.5 }, // Medium
      { count: 12, speedBase: 40, sizeBase: 15, blur: 3, opacity: 0.2 }, // Far
    ];

    return layers.flatMap((layer, layerIdx) => 
      Array.from({ length: layer.count }).map((_, i) => ({
        id: `${layerIdx}-${i}`,
        left: Math.random() * 105 - 2.5, // slightly wider to avoid edge gaps
        duration: layer.speedBase + Math.random() * 15,
        delay: Math.random() * -60, // staggered start
        size: layer.sizeBase + Math.random() * 15,
        opacity: layer.opacity,
        blur: layer.blur,
        drift: 20 + Math.random() * 80, // horizontal swing amount
        rotate: Math.random() * 360,
      }))
    );
  }, [theme]); // Only re-generate when the theme itself changes

  const getShape = () => {
    switch (theme) {
      case 'new-year': 
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full fill-white/80 drop-shadow-md">
            <path d="M12 2L13 9L20 10L14 13L15 20L10 16L5 20L6 13L0 10L7 9L8 2H12Z" />
            <circle cx="12" cy="12" r="1.5" fill="white" />
          </svg>
        );
      case 'spring':
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full fill-pink-200/90">
            <path d="M12.1,2c-1.2,0-2.4,0.4-3.4,1.1c-1,0.7-1.8,1.7-2.3,2.8c-0.5,1.1-0.7,2.4-0.4,3.6s0.9,2.3,1.9,3.1c1,0.8,2.2,1.3,3.4,1.3s2.4-0.4,3.4-1.1c1-0.7,1.8-1.7,2.3-2.8c0.5-1.1,0.7-2.4,0.4-3.6C17,5.2,16,4.1,15,3.3C14.1,2.5,13.1,2.1,12.1,2z" />
          </svg>
        );
      case 'autumn':
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full fill-orange-600/90 drop-shadow-lg">
            <path d="M22,12c-0.6-0.6-1.5-1-2.4-1.2c-0.5-1.3-1.4-2.5-2.6-3.3C16.8,6,16.5,4.3,16,2.6c-0.1-0.5-0.6-0.8-1.1-0.6L12,3.5L9.1,2C8.6,1.8,8,2.1,7.9,2.6c-0.5,1.7-0.8,3.4-1,4.9C5.7,8.3,4.8,9.5,4.3,10.8C3.4,11,2.5,11.4,1.9,12c-0.4,0.4-0.4,1,0,1.4c0.5,0.5,1.3,0.8,2.2,1c0.3,1.5,1,2.9,2,4.1c-0.1,1.5-0.1,3,0,4.5c0,0.5,0.5,0.9,1,0.9c0.2,0,0.4-0.1,0.5-0.2L12,21.5l4.4,2.2c0.2,0.1,0.4,0.2,0.5,0.2c0.5,0,0.9-0.4,1-0.9c0.1-1.5,0.1-3,0-4.5c1-1.2,1.7-2.6,2-4.1c0.9-0.2,1.7-0.5,2.2-1C22.4,13,22.4,12.4,22,12z" />
          </svg>
        );
      default: return null;
    }
  };

  const shape = getShape();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <style>{`
        @keyframes fallDrift {
          0% { 
            transform: translate3d(0, -150px, 0) rotate(0deg); 
            opacity: 0;
          }
          10% { opacity: var(--op); }
          90% { opacity: var(--op); }
          100% { 
            transform: translate3d(var(--drift), 110vh, 0) rotate(var(--rot)); 
            opacity: 0;
          }
        }
        
        @keyframes sway {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(30px); }
        }

        .particle {
          position: absolute;
          will-change: transform;
          animation: fallDrift var(--dur) linear infinite;
          animation-delay: var(--del);
          opacity: 0;
        }

        .sway-wrapper {
          animation: sway 4s ease-in-out infinite;
        }
      `}</style>
      
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            filter: p.blur > 0 ? `blur(${p.blur}px)` : 'none',
            '--dur': `${p.duration}s`,
            '--del': `${p.delay}s`,
            '--op': p.opacity,
            '--drift': `${p.drift}px`,
            '--rot': `${p.rotate + 720}deg`,
          } as React.CSSProperties}
        >
          <div className="sway-wrapper w-full h-full">
            {shape}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThemeOverlay;
