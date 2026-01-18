
import React, { useState } from 'react';
import { AUTH_TOKEN_STORAGE_KEY } from '../constants';

interface AuthProps {
  onLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!response.ok) {
        setError(true);
        setTimeout(() => setError(false), 2000);
        return;
      }
      const data = await response.json();
      if (!data?.token) {
        setError(true);
        setTimeout(() => setError(false), 2000);
        return;
      }
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
      onLogin();
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-fade-in border border-white/10">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <span className="text-4xl font-black italic">№ 1</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Вход в панель</h1>
          <p className="text-slate-500 font-medium">Администрирование меню</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full p-5 border rounded-2xl outline-none focus:ring-2 focus:ring-red-600 transition-all text-center text-2xl tracking-widest text-slate-900 placeholder:text-slate-200 ${error ? 'border-red-500 bg-red-50 animate-shake' : 'bg-slate-50 border-slate-200'}`}
              autoFocus
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xl shadow-lg hover:shadow-2xl transition-all active:scale-95 uppercase tracking-widest disabled:opacity-70"
          >
            {isLoading ? '...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
