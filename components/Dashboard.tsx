
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

  useEffect(() => {
    // When the dashboard mounts, fetch the latest programs from our store
    setPrograms(db.getPrograms());
  }, []);

  // Filter logic: This computed property updates automatically whenever searchQuery or filter state changes
  const filteredPrograms = programs.filter(p => {
    // 1. Title and Description Search (Live)
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const searchMatch = !normalizedQuery || 
                       p.title.toLowerCase().includes(normalizedQuery) || 
                       p.description.toLowerCase().includes(normalizedQuery);
    
    // 2. Status, Language, and Topic Filters
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
    
    // Refresh the local state so the new program appears immediately if filters allow
    setPrograms(db.getPrograms());
    onViewProgram(newProg.id);
  };

  const toggleTopic = (topicId: UUID) => {
    setNewProgramTopics(prev => 
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Create Program Modal */}
      {isCreatingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-amber-400 p-8 text-black shrink-0">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Launch New Program</h3>
              <p className="text-sm font-bold opacity-80 mt-1">Define the goals and domain of your new curriculum.</p>
            </div>
            <form onSubmit={handleConfirmCreate} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program Title</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  value={newProgramTitle}
                  onChange={(e) => setNewProgramTitle(e.target.value)}
                  placeholder="e.g. Master Class: Modern UI Design"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 outline-none transition-all font-bold text-slate-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Domain & Core Objectives</label>
                <textarea 
                  required
                  value={newProgramDomain}
                  onChange={(e) => setNewProgramDomain(e.target.value)}
                  placeholder="Describe what will be taught in this program..."
                  rows={3}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 outline-none transition-all font-bold text-slate-800"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Focus Topics</label>
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

              <div className="flex gap-4 pt-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsCreatingModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-black text-amber-400 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all transform active:scale-95"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Content Library</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your educational shorts and program catalog.</p>
        </div>
        <div className="flex items-center space-x-3">
          {userRole === Role.ADMIN && onViewUsers && (
            <button 
              onClick={onViewUsers}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-black py-4 px-8 rounded-2xl transition-all flex items-center space-x-3 border border-slate-200 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span className="text-xs uppercase tracking-widest">Manage Team</span>
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => setIsCreatingModalOpen(true)}
              className="bg-black text-amber-400 hover:bg-slate-800 font-black py-4 px-8 rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              <span className="text-xs uppercase tracking-widest">Create Program</span>
            </button>
          )}
        </div>
      </header>

      {userRole === Role.ADMIN && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2.5rem] flex flex-col justify-between group hover:bg-amber-100 transition-colors cursor-pointer" onClick={() => setIsCreatingModalOpen(true)}>
             <div>
               <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-black shadow-lg mb-6 group-hover:scale-110 transition-transform">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
               </div>
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">New Program Concept</h3>
               <p className="text-sm text-slate-600 mt-2 font-medium leading-relaxed">Instantly prototype a new educational track and define its core learning topics.</p>
             </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col justify-between">
             <div>
               <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center text-amber-400 shadow-lg">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                 </div>
                 <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-2.5 py-1 rounded uppercase tracking-widest border border-green-400/20">System Live</span>
               </div>
               <h3 className="text-xl font-black text-white uppercase tracking-tighter">Engagement Vitals</h3>
               <p className="text-sm text-slate-400 mt-2 font-medium leading-relaxed">Database synchronization is active. {programs.filter(p => p.status === Status.PUBLISHED).length} Programs are currently serving the public catalog.</p>
             </div>
          </div>
        </div>
      )}

      {/* Advanced Search & Filtering Bar */}
      <div className="bg-white p-3 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-3 items-center sticky top-24 z-30 transition-all">
        <div className="relative flex-grow w-full flex items-center group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search programs by title or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-amber-400 rounded-[1.75rem] outline-none font-bold text-slate-800 placeholder-slate-400 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 text-slate-400 hover:text-slate-600 p-2 bg-slate-200/50 rounded-full transition-all"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        
        <div className="flex gap-2 w-full lg:w-auto p-1.5 bg-slate-50 rounded-[1.75rem] border border-slate-200">
          <select 
            value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}
            className="bg-transparent border-none py-3 px-5 font-black text-[10px] uppercase tracking-widest text-slate-600 outline-none appearance-none cursor-pointer hover:text-black transition-colors"
          >
            <option value="">Status: All</option>
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="w-px h-6 bg-slate-300 my-auto"></div>
          <select 
            value={filter.topic}
            onChange={(e) => setFilter({...filter, topic: e.target.value})}
            className="bg-transparent border-none py-3 px-5 font-black text-[10px] uppercase tracking-widest text-slate-600 outline-none appearance-none cursor-pointer hover:text-black transition-colors"
          >
            <option value="">Topic: All</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredPrograms.map(p => (
          <div 
            key={p.id}
            onClick={() => onViewProgram(p.id)}
            className="group bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-2xl hover:border-amber-200 transition-all transform hover:-translate-y-2 flex flex-col"
          >
            <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
              <img 
                src={getPoster(p.id)} 
                alt={p.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute top-6 right-6">
                <span className={`px-3 py-1 text-[9px] font-black rounded-lg shadow-lg uppercase tracking-widest border border-white/20 backdrop-blur-md ${
                  p.status === Status.PUBLISHED ? 'bg-green-500/90 text-white' :
                  p.status === Status.DRAFT ? 'bg-amber-500/90 text-white' :
                  'bg-slate-900/90 text-white'
                }`}>
                  {p.status}
                </span>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-wrap gap-1.5">
                  {p.topic_ids.map(tid => (
                    <span key={tid} className="bg-amber-400 text-black text-[9px] font-black px-2.5 py-1 rounded uppercase tracking-tighter shadow-lg">
                      {topics.find(t => t.id === tid)?.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 flex-grow flex flex-col">
              <h3 className="font-black text-xl text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1 uppercase tracking-tight">{p.title}</h3>
              <p className="text-sm text-slate-500 mt-4 line-clamp-2 min-h-[40px] leading-relaxed font-medium">{p.description}</p>
              
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
                <div className="flex items-center space-x-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{p.language_primary}</span>
                  <span className="text-slate-300">/</span>
                  <span>{db.getTerms(p.id).length} Units</span>
                </div>
                <div className="text-[10px] text-slate-300 font-bold italic">
                  Modified {new Date(p.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredPrograms.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="inline-block p-8 bg-slate-50 rounded-full mb-6 border border-slate-100 shadow-inner">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">No results found</h3>
            <p className="text-slate-500 mt-3 font-medium max-w-sm mx-auto">We couldn't find any programs matching "<span className="text-amber-600 font-black">{searchQuery}</span>". Try refining your search or resetting filters.</p>
            <button 
                onClick={() => { setSearchQuery(''); setFilter({ status: '', language: '', topic: '' }); }}
                className="mt-10 px-8 py-3 bg-black text-amber-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
                Reset Search Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
