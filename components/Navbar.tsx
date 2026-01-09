
import React, { useState } from 'react';
import { User, Role } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  setView: (v: 'dashboard' | 'catalog' | 'users' | 'settings') => void;
  activeView: string;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

const Logo = () => (
  <div className="flex items-center space-x-3 group cursor-pointer select-none">
    <div className="relative w-12 h-12 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
        <circle cx="20" cy="20" r="3" fill="black" />
        <circle cx="28" cy="14" r="2" fill="black" />
        <circle cx="78" cy="18" r="3" fill="black" />
        <path d="M30 25 L70 25 L65 85 L35 85 Z" fill="none" stroke="black" strokeWidth="4" />
        <path d="M34 50 L66 50 L64 83 L36 83 Z" fill="black" />
        <path 
          d="M50 5 L72 45 L50 45 L68 95 L28 50 L50 50 Z" 
          fill="#FFCE00" 
          stroke="black" 
          strokeWidth="3" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <div className="flex flex-col leading-[0.85] pt-1">
      <span className="font-black text-2xl tracking-tighter text-[#FFCE00] uppercase" style={{ WebkitTextStroke: '1.5px black', textShadow: '2px 2px 0px black' }}>CHAI</span>
      <span className="font-black text-2xl tracking-tighter text-[#FFCE00] uppercase" style={{ WebkitTextStroke: '1.5px black', textShadow: '2px 2px 0px black' }}>SHOTS</span>
    </div>
  </div>
);

const translations: Record<string, Record<string, string>> = {
  English: {
    library: 'Library',
    team: 'Team',
    publicApi: 'Public API',
    home: 'Dashboard Home',
    manageTeam: 'Team Management',
    settings: 'Security Settings',
    signOut: 'Sign Out'
  },
  Hindi: {
    library: 'लाइब्रेरी',
    team: 'टीम',
    publicApi: 'पब्लिक API',
    home: 'डैशबोर्ड होम',
    manageTeam: 'टीम मैनेजमेंट',
    settings: 'सुरक्षा सेटिंग्स',
    signOut: 'साइन आउट'
  },
  Telugu: {
    library: 'లైబ్రరీ',
    team: 'టీమ్',
    publicApi: 'పబ్లిక్ API',
    home: 'డ్యాష్‌బోర్డ్ హోమ్',
    manageTeam: 'టీమ్ మేనేజ్మెంట్',
    settings: 'భద్రతా సెట్టింగులు',
    signOut: 'సైన్ అవుట్'
  },
  Spanish: {
    library: 'Biblioteca',
    team: 'Equipo',
    publicApi: 'API Pública',
    home: 'Inicio del Panel',
    manageTeam: 'Gestión de Equipo',
    settings: 'Seguridad',
    signOut: 'Cerrar Sesión'
  },
  French: {
    library: 'Bibliothèque',
    team: 'Équipe',
    publicApi: 'API Publique',
    home: 'Accueil',
    manageTeam: 'Gestion d\'Équipe',
    settings: 'Paramètres',
    signOut: 'Déconnexion'
  }
};

const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  onLogout, 
  setView, 
  activeView, 
  currentLanguage, 
  onLanguageChange 
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const languages = ['English', 'Hindi', 'Telugu', 'Spanish', 'French'];
  const t = translations[currentLanguage] || translations['English'];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-12">
          <div onClick={() => setView('dashboard')}>
            <Logo />
          </div>

          <div className="hidden lg:flex items-center space-x-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                activeView === 'dashboard' ? 'bg-black text-amber-400 shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t.library}
            </button>
            
            {user.role === Role.ADMIN && (
              <button 
                onClick={() => setView('users')}
                className={`px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                  activeView === 'users' ? 'bg-black text-amber-400 shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t.team}
              </button>
            )}
            
            <button 
              onClick={() => setView('catalog' as any)}
              className="px-5 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-black text-sm uppercase tracking-widest transition-all"
            >
              {t.publicApi}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all group"
            >
              <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 hidden sm:block">{currentLanguage}</span>
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-fade-in">
                  {languages.map(l => (
                    <button 
                      key={l}
                      onClick={() => { onLanguageChange(l); setShowLangMenu(false); }}
                      className={`w-full text-left px-6 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-amber-50 hover:text-amber-700 transition-colors ${l === currentLanguage ? 'bg-amber-50 text-amber-700' : 'text-slate-600'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-4 pl-2 group"
            >
              <div className="text-right hidden xs:block">
                <div className="text-sm font-black text-slate-900 leading-none group-hover:text-amber-600 transition-colors uppercase tracking-tight">{user.username}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-1.5 truncate max-w-[140px]">{user.email}</div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-400 flex items-center justify-center text-black font-black border-2 border-white shadow-md group-hover:rotate-6 transition-transform">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-fade-in origin-top-right transform transition-all">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-amber-400 flex items-center justify-center font-black text-3xl text-black border-4 border-white shadow-xl mb-4">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-black text-xl text-slate-900 leading-tight uppercase tracking-tighter">{user.username}</p>
                    <p className="text-xs text-slate-500 font-bold mt-1">{user.email}</p>
                    <div className="mt-4 inline-block px-3 py-1 bg-black text-amber-400 text-[9px] font-black rounded-lg uppercase tracking-widest shadow-lg">
                      {user.role} ACCESS
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <button 
                      onClick={() => { setView('dashboard'); setShowUserMenu(false); }}
                      className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-black rounded-2xl font-black flex items-center space-x-4 transition-all"
                    >
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-amber-100 transition-colors">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                      </div>
                      <span>{t.home}</span>
                    </button>
                    {user.role === Role.ADMIN && (
                      <button 
                        onClick={() => { setView('users'); setShowUserMenu(false); }}
                        className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-black rounded-2xl font-black flex items-center space-x-4 transition-all"
                      >
                        <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-amber-100 transition-colors">
                          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <span>{t.manageTeam}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { setView('settings'); setShowUserMenu(false); }}
                      className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-black rounded-2xl font-black flex items-center space-x-4 transition-all"
                    >
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-amber-100 transition-colors">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <span>{t.settings}</span>
                    </button>
                    <div className="h-px bg-slate-100 mx-4 my-2"></div>
                    <button 
                      onClick={() => { onLogout(); setShowUserMenu(false); }}
                      className="w-full text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 rounded-2xl font-black flex items-center space-x-4 transition-all"
                    >
                      <div className="p-2 bg-red-50 rounded-lg">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      </div>
                      <span>{t.signOut}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
