
import React, { useState, useEffect, useCallback } from 'react';
import { db } from './store';
import { User, Role, Status } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProgramDetail from './components/ProgramDetail';
import LessonEditor from './components/LessonEditor';
import PublicCatalog from './components/PublicCatalog';
import Navbar from './components/Navbar';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('chaishorts_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'program' | 'lesson' | 'catalog' | 'users' | 'settings'>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parentProgramId, setParentProgramId] = useState<string | null>(null);
  const [lastWorkerRun, setLastWorkerRun] = useState<string>(new Date().toLocaleTimeString());
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [language, setLanguage] = useState('English');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Initialize DB from Backend
  useEffect(() => {
    const initDB = async () => {
      await db.init();
      setIsInitializing(false);
    };
    initDB();
  }, []);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    showToast(`Display language updated to ${lang}`, 'success');
  };

  // Worker Process simulation
  useEffect(() => {
    const interval = setInterval(async () => {
      await db.processScheduled();
      setLastWorkerRun(new Date().toLocaleTimeString());
    }, 15000); 
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('chaishorts_user', JSON.stringify(u));
    showToast(`Welcome back, ${u.username}!`, 'success');
  };

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('chaishorts_user');
    setCurrentView('dashboard');
    showToast('Logged out successfully', 'info');
  }, [showToast]);

  const goBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedId(null);
    setParentProgramId(null);
  };

  const goBackToProgram = () => {
    if (parentProgramId) {
      setSelectedId(parentProgramId);
      setCurrentView('program');
    } else {
      goBackToDashboard();
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Connecting to Engine...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (currentView === 'catalog') {
      return (
        <div className="fixed inset-0 bg-white z-[100] overflow-auto">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="fixed top-8 right-8 bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black shadow-2xl hover:bg-slate-50 transition-all z-[110] flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            <span>Exit Catalog</span>
          </button>
          <PublicCatalog />
        </div>
      );
    }

    return (
      <div className="min-h-screen">
        <Login onLogin={handleLogin} />
        
        <div className="fixed bottom-12 left-0 right-0 flex justify-center z-20">
          <button 
            onClick={() => setCurrentView('catalog')}
            className="text-white/80 hover:text-white font-black text-sm tracking-widest transition-colors flex items-center space-x-2 bg-black/20 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 shadow-2xl hover:bg-black/40"
          >
            <span>EXPLORE PUBLIC API CATALOG</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        setView={(v) => {
            if (v === 'catalog' as any) {
                setCurrentView('catalog');
            } else {
                setCurrentView(v);
            }
        }} 
        activeView={currentView}
        currentLanguage={language}
        onLanguageChange={handleLanguageChange}
      />
      
      {currentView === 'catalog' && (
        <div className="fixed inset-0 bg-white z-[100] overflow-auto">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="fixed top-8 right-8 bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black shadow-2xl hover:bg-slate-50 transition-all z-[110] flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            <span>Exit Catalog</span>
          </button>
          <PublicCatalog />
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-10 max-w-7xl relative">
        {currentView === 'dashboard' && (
          <Dashboard 
            onViewProgram={(id) => { setSelectedId(id); setCurrentView('program'); }}
            canEdit={user.role !== Role.VIEWER}
            userRole={user.role}
            onViewUsers={() => setCurrentView('users')}
          />
        )}
        
        {currentView === 'users' && user.role === Role.ADMIN && (
          <UserManagement 
            currentUser={user}
            onLogout={handleLogout}
            onBack={goBackToDashboard} 
            showToast={showToast} 
          />
        )}

        {currentView === 'settings' && (
          <Settings 
            user={user} 
            onUpdate={(u) => { setUser({...u}); showToast('Settings updated', 'success'); }} 
            onBack={goBackToDashboard}
          />
        )}
        
        {currentView === 'program' && selectedId && (
          <ProgramDetail 
            id={selectedId} 
            onBack={goBackToDashboard}
            onEditLesson={(lessonId) => { 
              setParentProgramId(selectedId);
              setSelectedId(lessonId); 
              setCurrentView('lesson'); 
            }}
            role={user.role}
            showToast={showToast}
          />
        )}

        {currentView === 'lesson' && selectedId && (
          <LessonEditor 
            id={selectedId}
            onBack={goBackToProgram}
            role={user.role}
            showToast={showToast}
          />
        )}

        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in">
            <div className={`px-8 py-4 rounded-2xl shadow-2xl border-2 flex items-center space-x-3 ${
              toast.type === 'success' ? 'bg-white border-green-500 text-green-700' :
              toast.type === 'error' ? 'bg-white border-red-500 text-red-700' :
              'bg-white border-blue-500 text-blue-700'
            }`}>
              {toast.type === 'success' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              {toast.type === 'error' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
              <span className="font-black text-sm uppercase tracking-widest">{toast.message}</span>
            </div>
          </div>
        )}

        {/* Worker Status Indicator */}
        <div className="fixed bottom-6 right-6 bg-white border border-slate-200 rounded-2xl shadow-xl px-5 py-3 flex items-center space-x-3 z-50 animate-fade-in">
           <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
           </div>
           <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Scheduler Active</div>
              <div className="text-[9px] text-slate-500 font-bold mt-1">Last Sync: {lastWorkerRun}</div>
           </div>
        </div>
      </main>

      <style>{`
        @keyframes bounce-in {
          0% { transform: translate(-50%, -20px); opacity: 0; }
          70% { transform: translate(-50%, 10px); opacity: 1; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
