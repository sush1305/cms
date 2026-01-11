import React, { useState } from 'react';
import { db } from '../store';
import { 
  Program, Term, Status, Role, Topic, AssetType, AssetVariant, Asset 
} from '../types';

interface ProgramDetailProps {
  id: string;
  onBack: () => void;
  onEditLesson: (id: string) => void;
  role: Role;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ProgramDetail: React.FC<ProgramDetailProps> = ({ id, onBack, onEditLesson, role, showToast }) => {
  const [program, setProgram] = useState<Program | undefined>(db.getProgram(id));
  const [lessonStatusFilter, setLessonStatusFilter] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  
  const topics = db.getTopics();
  const terms = db.getTerms(id);
  const assets = db.getAssets(id);
  const [activeTab, setActiveTab] = useState<'info' | 'assets' | 'content'>('content');

  if (!program) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Program not found</div>;

  const handleUpdate = () => {
    db.updateProgram(program);
    showToast?.('Program settings saved', 'success');
  };

  const handleDeleteProgram = () => {
    // Permanent deletion confirmation
    if (window.confirm(`PERMANENT DELETION: Are you sure you want to completely remove "${program.title}"?\n\nThis action will erase all units, modules, and associated media assets. This cannot be undone.`)) {
      try {
        db.deleteProgram(id);
        showToast?.('Program successfully removed from library', 'info');
        // Navigate away after deletion
        onBack();
      } catch (error) {
        console.error('Program deletion failed:', error);
        showToast?.('System error during deletion.', 'error');
      }
    }
  };

  const handleCreateTerm = () => {
    if (role === Role.VIEWER) return;
    const title = prompt('Term Title:');
    if (title === null) return;
    db.createTerm({
      program_id: id,
      term_number: terms.length + 1,
      title: title || `Term ${terms.length + 1}`
    });
    showToast?.('New term created', 'success');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteTerm = (termId: string) => {
    if (window.confirm('Delete this term and all its lessons? This action is permanent.')) {
      db.deleteTerm(termId);
      showToast?.('Term removed', 'info');
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleDeleteLesson = (e: React.MouseEvent, lessonId: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Permanently delete lesson "${title}"?`)) {
      db.deleteLesson(lessonId);
      showToast?.('Lesson deleted', 'info');
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleAddLesson = (termId: string) => {
    if (role === Role.VIEWER) return;
    const existing = db.getLessons(termId);
    const newLesson = db.createLesson({
      term_id: termId,
      lesson_number: existing.length + 1,
      title: 'Untitled Lesson',
      status: Status.DRAFT,
      content_type: 'video' as any,
      is_paid: false,
      content_language_primary: program.language_primary,
      content_languages_available: [program.language_primary],
      content_urls_by_language: { [program.language_primary]: '' },
      subtitle_languages: [],
      subtitle_urls_by_language: {}
    });
    showToast?.('Draft lesson added', 'success');
    onEditLesson(newLesson.id);
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Breadcrumbs & Header */}
      <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
        <button onClick={onBack} className="hover:text-amber-600 transition-colors">Library</button>
        <span>/</span>
        <span className="text-slate-900">{program.title}</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack} 
            className="p-4 hover:bg-black hover:text-white bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm transition-all"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">{program.title}</h2>
            <div className="flex items-center space-x-4 mt-3">
              <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest shadow-sm ${
                program.status === Status.PUBLISHED ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
              }`}>{program.status}</span>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">ID: {program.id} • PRIMARY: {program.language_primary}</span>
            </div>
          </div>
        </div>
        
        {role !== Role.VIEWER && (
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleDeleteProgram}
              className="px-6 py-4 text-red-600 font-black text-xs hover:bg-red-50 rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-red-100"
            >
              Delete Program
            </button>
            <button 
              onClick={handleUpdate}
              className="bg-black hover:bg-slate-800 text-amber-400 font-black py-4 px-10 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest"
            >
              Save Changes
            </button>
          </div>
        )}
      </header>

      {/* Tabs Layout */}
      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-[2rem] w-fit border border-slate-200/60 shadow-inner">
        {[
            { id: 'content', label: 'Curriculum & Units' },
            { id: 'info', label: 'Program Settings' },
            { id: 'assets', label: 'Branding Assets' }
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-10 py-3.5 rounded-[1.5rem] font-black transition-all text-[10px] uppercase tracking-widest ${
                    activeTab === tab.id ? 'bg-white text-black shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px] transition-all">
        {activeTab === 'content' && (
          <div className="p-12 space-y-16">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Course Curriculum</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Build and manage the learning path for your students.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-slate-50 p-1.5 rounded-2xl flex items-center border border-slate-200 shadow-inner">
                    {['', Status.DRAFT, Status.SCHEDULED, Status.PUBLISHED].map(s => (
                        <button 
                            key={s}
                            onClick={() => setLessonStatusFilter(s)}
                            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                lessonStatusFilter === s ? 'bg-black text-amber-400 shadow-lg' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {s === '' ? 'All' : s}
                        </button>
                    ))}
                </div>
                {role !== Role.VIEWER && (
                  <button 
                    onClick={handleCreateTerm}
                    className="w-full sm:w-auto bg-amber-400 text-black hover:bg-amber-500 font-black py-3.5 px-8 rounded-2xl transition-all shadow-lg active:scale-95 uppercase text-[10px] tracking-widest"
                  >
                    + Add New Term
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-10">
              {terms.length === 0 ? (
                <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  </div>
                  <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">No terms defined yet</h4>
                  {role !== Role.VIEWER && (
                    <button onClick={handleCreateTerm} className="mt-6 text-amber-600 font-black uppercase text-xs tracking-widest hover:underline">Create your first term</button>
                  )}
                </div>
              ) : (
                terms.map(term => {
                  const termLessons = db.getLessons(term.id).filter(l => !lessonStatusFilter || l.status === lessonStatusFilter);
                  return (
                    <div key={term.id} className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                      <div className="px-10 py-6 bg-slate-100/50 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-black text-amber-400 rounded-xl flex items-center justify-center font-black text-sm">
                            {term.term_number}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase tracking-tight">{term.title || `Term ${term.term_number}`}</h4>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{termLessons.length} Modules</span>
                          </div>
                        </div>
                        {role !== Role.VIEWER && (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleAddLesson(term.id)}
                              className="p-3 text-slate-400 hover:text-amber-600 hover:bg-white rounded-xl transition-all"
                              title="Add Lesson"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteTerm(term.id)}
                              className="p-3 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all"
                              title="Delete Term"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        {termLessons.map(lesson => (
                          <div 
                            key={lesson.id}
                            onClick={() => onEditLesson(lesson.id)}
                            className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group cursor-pointer hover:border-amber-400 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                {lesson.lesson_number}
                              </div>
                              <div>
                                <h5 className="font-black text-slate-900 text-sm uppercase tracking-tight">{lesson.title}</h5>
                                <div className="flex items-center space-x-3 mt-1">
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${
                                    lesson.status === Status.PUBLISHED ? 'text-green-600' : 'text-amber-600'
                                  }`}>{lesson.status}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">{lesson.content_type}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {role !== Role.VIEWER && (
                                <button 
                                  onClick={(e) => handleDeleteLesson(e, lesson.id, lesson.title)}
                                  className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  title="Delete Lesson"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                              <svg className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            </div>
                          </div>
                        ))}
                        {termLessons.length === 0 && (
                          <div className="py-10 text-center">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No modules in this unit</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="p-12 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program Name</label>
                  <input 
                    type="text" value={program.title} 
                    disabled={role === Role.VIEWER}
                    onChange={(e) => setProgram({...program, title: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all uppercase tracking-tight"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Language</label>
                  <input 
                    type="text" value={program.language_primary} 
                    disabled={role === Role.VIEWER}
                    onChange={(e) => setProgram({...program, language_primary: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all uppercase tracking-widest"
                  />
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program Narrative</label>
                  <textarea 
                    value={program.description} 
                    disabled={role === Role.VIEWER}
                    onChange={(e) => setProgram({...program, description: e.target.value})}
                    rows={5}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-bold text-slate-800 transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
           <div className="p-12">
             <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Promotional Material</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Posters and cover art used in the catalog discovery feed.</p>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                {[AssetVariant.PORTRAIT, AssetVariant.LANDSCAPE, AssetVariant.SQUARE, AssetVariant.BANNER].map(variant => {
                  const asset = assets.find(a => a.variant === variant && a.asset_type === AssetType.POSTER);
                  return (
                    <div key={variant} className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{variant}</label>
                      <div className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] overflow-hidden relative group hover:border-amber-400 transition-all hover:shadow-2xl hover:shadow-amber-100/50">
                        {asset ? <img src={asset.url} alt={variant} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Missing</div>}
                        {role !== Role.VIEWER && (
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[4px] transition-all">
                            <button onClick={() => {
                              const url = prompt('Poster URL:', asset?.url || '');
                              if (url !== null) {
                                db.upsertAsset({ parent_id: id, language: program.language_primary, variant, asset_type: AssetType.POSTER, url });
                                showToast?.('Poster updated', 'success');
                                setRefreshTrigger(prev => prev + 1);
                              }
                            }} className="bg-amber-400 text-black px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-all">Link Artwork</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default ProgramDetail;