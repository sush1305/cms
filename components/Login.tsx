
import React, { useState } from 'react';
import { db } from '../store';
import { User, Role } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const LoginLogo = () => (
  <div className="flex flex-col items-center select-none">
    <div className="relative w-32 h-32 mb-4 drop-shadow-2xl">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Splash Droplets */}
        <circle cx="20" cy="20" r="3" fill="white" />
        <circle cx="28" cy="14" r="2" fill="white" />
        <circle cx="78" cy="18" r="3" fill="white" />
        
        {/* Glass Outline */}
        <path d="M30 25 L70 25 L65 85 L35 85 Z" fill="none" stroke="white" strokeWidth="4" />
        {/* Liquid */}
        <path d="M34 50 L66 50 L64 83 L36 83 Z" fill="white" />
        {/* Lighting Bolt */}
        <path 
          d="M50 5 L72 45 L50 45 L68 95 L28 50 L50 50 Z" 
          fill="#FFCE00" 
          stroke="black" 
          strokeWidth="3" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <div className="flex flex-col leading-[0.85] text-center pt-2">
      <span className="font-black text-5xl tracking-tighter text-[#FFCE00] uppercase" style={{ WebkitTextStroke: '2px black', textShadow: '4px 4px 0px black' }}>CHAI</span>
      <span className="font-black text-5xl tracking-tighter text-[#FFCE00] uppercase" style={{ WebkitTextStroke: '2px black', textShadow: '4px 4px 0px black' }}>SHOTS</span>
    </div>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const user = db.getUserByEmail(email);
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('Access denied. Invalid credentials provided.');
      }
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-orange-500 p-6">
      <div className="w-full max-w-xl bg-white rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.35)] border border-slate-100 overflow-hidden transform transition-all animate-fade-in">
        <div className="bg-gradient-to-br from-orange-600 to-amber-600 p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
          
          <div className="relative z-10">
            <LoginLogo />
            <div className="mt-10 inline-block px-5 py-2 bg-black/20 backdrop-blur-md text-white font-black text-[10px] rounded-full uppercase tracking-[0.35em] border border-white/20">
              Enterprise Admin Console
            </div>
          </div>
        </div>
        
        <div className="p-16 bg-white">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-xs font-black border border-red-100 text-center uppercase tracking-widest animate-pulse">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Member Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@chaishorts.com"
                className="w-full px-8 py-5 rounded-[2rem] border-2 border-slate-50 focus:border-amber-400 focus:ring-0 outline-none transition-all font-black text-slate-800 placeholder-slate-300 bg-slate-50/30"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Security Key</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-8 py-5 rounded-[2rem] border-2 border-slate-50 focus:border-amber-400 focus:ring-0 outline-none transition-all font-black text-slate-800 placeholder-slate-300 bg-slate-50/30"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-6 px-4 rounded-[2.5rem] text-white font-black text-xl shadow-2xl transform active:scale-95 transition-all mt-6 relative overflow-hidden group ${
                isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-black hover:bg-slate-900'
              }`}
            >
              <span className={`relative z-10 ${isLoading ? 'opacity-0' : 'opacity-100'} uppercase tracking-widest`}>
                Log In
              </span>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="animate-spin h-8 w-8 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
              )}
            </button>
          </form>

          <div className="mt-12 pt-10 border-t border-slate-100 flex flex-col">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-6 text-center">Development Access Panel</p>
            <div className="grid grid-cols-1 gap-3">
               <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group/access hover:bg-slate-100 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Admin</span>
                  <span className="text-[10px] font-bold text-slate-700">admin@chaishorts.com / admin123</span>
               </div>
               <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group/access hover:bg-slate-100 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Editor</span>
                  <span className="text-[10px] font-bold text-slate-700">editor@chaishorts.com / editor123</span>
               </div>
               <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group/access hover:bg-slate-100 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Viewer</span>
                  <span className="text-[10px] font-bold text-slate-700">viewer@chaishorts.com / viewer123</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
