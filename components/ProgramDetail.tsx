
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
}

const ProgramDetail: React.FC<ProgramDetailProps> = ({ id, onBack, onEditLesson, role }) => {
  const [program, setProgram] = useState<Program | undefined>(db.getProgram(id));
  const [lessonStatusFilter, setLessonStatusFilter] = useState<string>('');
  const topics = db.getTopics();
  const terms = db.getTerms(id);
  const assets = db.getAssets(id);
  const [activeTab, setActiveTab] = useState<'info' | 'assets' | 'content'>('content');

  if (!program) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Program not found</div>;

  const handleUpdate = () => {
    db.updateProgram(program);
    alert('Program updated successfully');
  };

  const handleDeleteProgram = () => {
    if (confirm(`DANGER: Are you sure you want to delete "${program.title}"? This will permanently remove all associated terms, lessons, and assets. This action is irreversible.`)) {
      db.deleteProgram(id);
      onBack(); // Navigation back to dashboard
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
    setProgram({ ...program });
  };

  const handleDeleteTerm = (termId: string) => {
    if (confirm('Delete this term and all its lessons?')) {
      db.deleteTerm(termId);
      setProgram({ ...program });
    }
  };

  const handleAddLesson = (termId: string) => {
    if (role === Role.VIEWER) return;
    const existing = db.getLessons(termId);
    const newLesson = db.createLesson({
      term_id: termId,
      lesson_number: existing.length + 1,
      title: 'New Snappy Lesson',
      status: Status.DRAFT,
      content_type: 'video' as any,
      is_paid: false,
      content_language_primary: program.language_primary,
      content_languages_available: [program.language_primary],
      content_urls_by_language: { [program.language_primary]: '' },
      subtitle_languages: [],
      subtitle_urls_by_language: {}
    });
    onEditLesson(newLesson.id);
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack} 
            className="p-4 hover:bg-black hover:text-white bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{program.title}</h2>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-widest shadow-sm ${
                program.status === Status.PUBLISHED ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
              }`}>{program.status}</span>
              <span className="text-slate-400 text-xs font-bold">L# {program.language_primary.toUpperCase()} • Created {new Date(program.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        {role !== Role.VIEWER && (
          <div className="flex items-center space-x-3">
             <button 
              onClick={handleDeleteProgram}
              className="px-6 py-3.5 text-red-600 font-black text-sm hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
            >
              Delete Program
            </button>
            <button 
              onClick={handleUpdate}
              className="bg-black hover:bg-slate-800 text-amber-400 font-black py-3.5 px-8 rounded-2xl shadow-xl transition-all active:scale-95"
            >
              Save Changes
            </button>
          </div>
        )}
      </header>

      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200 shadow-inner">
        {[
            { id: 'content', label: 'Curriculum' },
            { id: 'info', label: 'Details' },
            { id: 'assets', label: 'Marketing Assets' }
        ].map(tab => (
            <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)} 
                className={`px-8 py-2.5 rounded-xl font-black transition-all text-xs uppercase tracking-widest ${
                    activeTab === tab.id ? 'bg-white text-black shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {activeTab === 'content' && (
          <div className="p-10 space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Curriculum</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Draft, schedule and manage lesson units.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="bg-slate-50 p-1 rounded-2xl flex items-center border border-slate-200">
                    <button 
                        onClick={() => setLessonStatusFilter('')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                            lessonStatusFilter === '' ? 'bg-black text-amber-400 shadow-lg' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        All
                    </button>
                    {Object.values(Status).map(s => (
                        <button 
                            key={s}
                            onClick={() => setLessonStatusFilter(s)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                                lessonStatusFilter === s ? 'bg-black text-amber-400 shadow-lg' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                {role !== Role.VIEWER && (
                  <button 
                    onClick={handleCreateTerm}
                    className="w-full sm:w-auto bg-amber-400 text-black hover:bg-amber-500 font-black py-3 px-8 rounded-2xl transition-all shadow-lg active:scale-95"
                  >
                    + Add Term
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-12">
              {terms.length === 0 && (
                <div className="text-center py-24 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No curriculum units yet</p>
                  <button onClick={handleCreateTerm} className="mt-4 text-amber-600 font-black hover:underline">Create your first term</button>
                </div>
              )}
              
              {terms.map((term) => {
                const termLessons = db.getLessons(term.id).filter(l => !lessonStatusFilter || l.status === lessonStatusFilter);
                
                return (
                  <div key={term.id} className="group border border-slate-200 rounded-[2.5rem] overflow-hidden transition-all hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-100/50 bg-white">
                    <div className="px-10 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-black text-amber-400 flex items-center justify-center rounded-2xl font-black text-sm shadow-xl">
                          {term.term_number}
                        </div>
                        <div>
                            <h4 className="font-black text-xl text-slate-900">{term.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{termLessons.length} units matching filters</p>
                        </div>
                      </div>
                      {role !== Role.VIEWER && (
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => handleAddLesson(term.id)}
                            className="bg-white text-black border border-slate-200 hover:border-amber-400 font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm"
                          >
                            + New Lesson
                          </button>
                          <button 
                            onClick={() => handleDeleteTerm(term.id)}
                            className="text-slate-300 hover:text-red-500 p-2 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                            <tr>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Title</th>
                              <th className="px-6 py-4">Type</th>
                              <th className="px-6 py-4">Access</th>
                              <th className="px-6 py-4 text-right">Manage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {termLessons.map(lesson => (
                              <tr key={lesson.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                <td className="px-6 py-5">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm ${
                                    lesson.status === Status.PUBLISHED ? 'bg-green-500 text-white' :
                                    lesson.status === Status.SCHEDULED ? 'bg-blue-500 text-white' :
                                    lesson.status === Status.ARCHIVED ? 'bg-slate-400 text-white' :
                                    'bg-amber-400 text-black'
                                  }`}>
                                    {lesson.status}
                                  </span>
                                </td>
                                <td className="px-6 py-5 font-black text-slate-800">{lesson.title}</td>
                                <td className="px-6 py-5">
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{lesson.content_type}</span>
                                </td>
                                <td className="px-6 py-5">
                                  {lesson.is_paid ? 
                                    <span className="text-black text-[9px] font-black bg-amber-400 px-2 py-1 rounded-md shadow-sm">PREMIUM</span> : 
                                    <span className="text-slate-300 text-[9px] font-black uppercase">Free</span>
                                  }
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <button 
                                    onClick={() => onEditLesson(lesson.id)}
                                    className="bg-slate-100 group-hover/row:bg-black group-hover/row:text-amber-400 text-slate-900 p-2 rounded-xl transition-all shadow-sm"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {termLessons.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 font-bold italic text-sm">No items found for this filter.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="p-10">
            <div className="max-w-4xl space-y-12">
                <div>
                    <h3 className="text-2xl font-black text-slate-900">Program Settings</h3>
                    <p className="text-slate-500 font-medium">Configure basic information and metadata.</p>
                </div>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Title</label>
                    <input 
                      type="text" 
                      value={program.title} 
                      disabled={role === Role.VIEWER}
                      onChange={(e) => setProgram({...program, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-900 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Description / Domain</label>
                    <textarea 
                      rows={6}
                      value={program.description} 
                      disabled={role === Role.VIEWER}
                      onChange={(e) => setProgram({...program, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-900 transition-all leading-relaxed"
                    />
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Primary Language</label>
                    <select 
                      value={program.language_primary} 
                      disabled={role === Role.VIEWER}
                      onChange={(e) => setProgram({...program, language_primary: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-amber-500 font-black text-slate-900"
                    >
                      <option value="en">English (US/UK)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="te">Telugu (తెలుగు)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Taxonomy / Topics</label>
                    <div className="flex flex-wrap gap-2.5 p-5 bg-slate-50 rounded-[2rem] border border-slate-200 shadow-inner">
                      {topics.map(t => (
                        <label key={t.id} className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl border-2 cursor-pointer transition-all shadow-sm ${
                          program.topic_ids.includes(t.id) 
                            ? 'bg-black border-black text-amber-400' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-amber-400'
                        }`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            disabled={role === Role.VIEWER}
                            checked={program.topic_ids.includes(t.id)}
                            onChange={(e) => {
                              const newTopics = e.target.checked 
                                ? [...program.topic_ids, t.id]
                                : program.topic_ids.filter(tid => tid !== t.id);
                              setProgram({...program, topic_ids: newTopics});
                            }}
                          />
                          <span className="text-xs font-black uppercase tracking-tighter">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="p-10 space-y-12">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Branding & Posters</h3>
              <p className="text-slate-500 font-medium">Visual assets for various display sizes across platforms.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {[AssetVariant.PORTRAIT, AssetVariant.LANDSCAPE, AssetVariant.SQUARE, AssetVariant.BANNER].map(variant => {
                const asset = assets.find(a => a.variant === variant && a.asset_type === AssetType.POSTER);
                return (
                  <div key={variant} className="space-y-4 group/asset">
                    <div className="flex items-center justify-between px-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{variant}</label>
                      {asset && (
                        <div className="flex items-center space-x-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[8px] text-green-600 font-black uppercase">Live</span>
                        </div>
                      )}
                    </div>
                    <div className="aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] overflow-hidden relative group transition-all hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-100/50">
                      {asset ? (
                        <img src={asset.url} alt={variant} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
                           <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest">Required</span>
                        </div>
                      )}
                      {role !== Role.VIEWER && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[2px]">
                          <button 
                            onClick={() => {
                              const url = prompt('Direct Image Link:', asset?.url || '');
                              if (url !== null) {
                                db.upsertAsset({
                                  parent_id: id,
                                  language: program.language_primary,
                                  variant,
                                  asset_type: AssetType.POSTER,
                                  url
                                });
                                setProgram({ ...program });
                              }
                            }}
                            className="bg-amber-400 text-black px-6 py-3 rounded-2xl font-black text-xs shadow-2xl transform scale-90 group-hover:scale-100 transition-all duration-300 active:scale-95"
                          >
                            {asset ? 'Change Asset' : 'Upload Link'}
                          </button>
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
