import React, { useState, useEffect } from 'react';
import { db } from '../store';
import { Status, Program, AssetType, AssetVariant, Role, UUID } from '../types';

interface DashboardProps {
  onViewProgram: (id: string) => void;
  canEdit: boolean;
  userRole?: Role;
  onViewUsers?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewProgram, canEdit, userRole, onViewUsers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [programs, setPrograms] = useState<Program[]>(db.getPrograms());
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramDomain, setNewProgramDomain] = useState('');
  const [newProgramTopics, setNewProgramTopics] = useState<UUID[]>([]);
  
  const [filter, setFilter] = useState({
    status: '',
    language: '',
    topic: ''
  });

  const topics = db.getTopics();

  const refreshPrograms = () => {
    setPrograms(db.getPrograms());
  };

  useEffect(() => {
    refreshPrograms();
  }, []);

  const filteredPrograms = programs.filter(p => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const searchMatch = !normalizedQuery || 
                       p.title.toLowerCase().includes(normalizedQuery) || 
                       p.description.toLowerCase().includes(normalizedQuery);
    
    const statusMatch = !filter.status || p.status === filter.status;
    const langMatch = !filter.language || p.language_primary === filter.language;
    const topicMatch = !filter.topic || p.topic_ids.includes(filter.topic);
    
    return searchMatch && statusMatch && langMatch && topicMatch;
  });

  const getPoster = (programId: string) => {
    const assets = db.getAssets(programId);
    return assets.find(a => a.asset_type === AssetType.POSTER && a.variant === AssetVariant.PORTRAIT)?.url || 'https://picsum.photos/400/600';
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgramTitle.trim()) return;
    
    const newProg = db.createProgram({
      title: newProgramTitle,
      description: newProgramDomain || 'Educational program exploring ' + newProgramTitle,
      language_primary: 'en',
      languages_available: ['en'],
      topic_ids: newProgramTopics,
      status: Status.DRAFT
    });
    
    setIsCreatingModalOpen(false);
    setNewProgramTitle('');
    setNewProgramDomain('');
    setNewProgramTopics([]);
    
    refreshPrograms();
    onViewProgram(newProg.id);
  };

  const handleDeleteProgram = (e: React.MouseEvent, id: UUID, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to permanently delete "${title}"? This will also remove all associated lessons and media.`)) {
      db.deleteProgram(id);
      refreshPrograms();
    }
  };

  const toggleTopic = (topicId: UUID) => {
    setNewProgramTopics(prev => 
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  return (
    <div className="space-y-10 pb-12 animate-fade-in">
      {isCreatingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-amber-400 p-8 text-black shrink-0">
              <h3 className="text-2xl font-black uppercase tracking-tighter">New Program</h3>
            </div>
            <form onSubmit={handleConfirmCreate} className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={newProgramTitle}
                  onChange={(e) => setNewProgramTitle(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 outline-none font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  required
                  value={newProgramDomain}
                  onChange={(e) => setNewProgramDomain(e.target.value)}
                  rows={3}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 outline-none font-bold"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Topics</label>
                <div className="flex flex-wrap gap-2">
                  {topics.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTopic(t.id)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border-2 transition-all ${
                        newProgramTopics.includes(t.id) 
                        ? 'bg-black border-black text-amber-400 shadow-md' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-amber-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsCreatingModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-black text-amber-400 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Content Library</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage programs and catalog.</p>
        </div>
        <div className="flex items-center space-x-3">
          {userRole === Role.ADMIN && onViewUsers && (
            <button 
              onClick={onViewUsers}
              className="bg-white text-slate-700 hover:bg-slate-50 font-black py-4 px-8 rounded-2xl transition-all border border-slate-200 shadow-sm"
            >
              Manage Team
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => setIsCreatingModalOpen(true)}
              className="bg-black text-amber-400 hover:bg-slate-800 font-black py-4 px-8 rounded-2xl shadow-xl transition-all"
            >
              + Create Program
            </button>
          )}
        </div>
      </header>

      <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <input 
            type="text" 
            placeholder="Search programs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-6 pr-14 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-amber-400 rounded-[1.75rem] outline-none font-bold transition-all"
          />
        </div>
        
        <div className="flex gap-4">
          <select 
            value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}
            className="bg-slate-50 border-2 border-transparent focus:border-amber-400 py-4 px-6 rounded-[1.75rem] font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={filter.topic}
            onChange={(e) => setFilter({...filter, topic: e.target.value})}
            className="bg-slate-50 border-2 border-transparent focus:border-amber-400 py-4 px-6 rounded-[1.75rem] font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer"
          >
            <option value="">All Topics</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {filteredPrograms.map(p => (
          <div 
            key={p.id}
            onClick={() => onViewProgram(p.id)}
            className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:border-amber-200 transition-all transform hover:-translate-y-2 flex flex-col relative"
          >
            <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
              <img 
                src={getPoster(p.id)} 
                alt={p.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
                <span className="px-3 py-1.5 text-[9px] font-black rounded-lg shadow-lg uppercase tracking-widest bg-black text-amber-400">
                  {p.status}
                </span>
                
                {canEdit && (
                  <button 
                    onClick={(e) => handleDeleteProgram(e, p.id, p.title)}
                    className="p-2.5 bg-red-600/90 text-white rounded-xl shadow-lg border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700"
                    title="Delete Program"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 transition-opacity"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="font-black text-xl text-white line-clamp-2 uppercase tracking-tight leading-tight">{p.title}</h3>
              </div>
            </div>
          </div>
        ))}

        {filteredPrograms.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">No matching programs</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;