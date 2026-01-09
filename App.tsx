
import React, { useState, useEffect } from 'react';
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
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('chaishorts_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'program' | 'lesson' | 'catalog' | 'users' | 'settings'>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastWorkerRun, setLastWorkerRun] = useState<string>(new Date().toLocaleTimeString());

  // Worker Process simulation
  useEffect(() => {
    const interval = setInterval(() => {
      db.processScheduled();
      setLastWorkerRun(new Date().toLocaleTimeString());
    }, 15000); // Check every 15s for demo responsiveness
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('chaishorts_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chaishorts_user');
    setCurrentView('dashboard');
  };

  const goBackToDashboard = () => setCurrentView('dashboard');

  if (!user) {
    if (currentView === 'catalog') {
      return (
        <div className="fixed inset-0 bg-white z-[100] overflow-auto">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="fixed top-8 right-8 bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black shadow-2xl hover:bg-slate-50 transition-all z-[110]"
          >
            ✕ Exit Catalog
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
            className="text-white/80 hover:text-white font-black text-sm tracking-widest transition-colors flex items-center space-x-2 bg-black/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
          >
            <span>EXPLORE PUBLIC API CATALOG</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
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
      />
      
      {currentView === 'catalog' && (
        <div className="fixed inset-0 bg-white z-[100] overflow-auto">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="fixed top-8 right-8 bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black shadow-2xl hover:bg-slate-50 transition-all z-[110]"
          >
            ✕ Exit Catalog
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
          <UserManagement onBack={goBackToDashboard} />
        )}

        {currentView === 'settings' && (
          <Settings 
            user={user} 
            onUpdate={(u) => setUser({...u})} 
            onBack={goBackToDashboard}
          />
        )}
        
        {currentView === 'program' && selectedId && (
          <ProgramDetail 
            id={selectedId} 
            onBack={goBackToDashboard}
            onEditLesson={(id) => { setSelectedId(id); setCurrentView('lesson'); }}
            role={user.role}
          />
        )}

        {currentView === 'lesson' && selectedId && (
          <LessonEditor 
            id={selectedId}
            onBack={() => setCurrentView('program')}
            role={user.role}
          />
        )}

        {/* Worker Status Indicator */}
        <div className="fixed bottom-6 right-6 bg-white border border-slate-200 rounded-2xl shadow-xl px-5 py-3 flex items-center space-x-3 z-50 animate-fade-in pointer-events-none">
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
    </div>
  );
};

export default App;
