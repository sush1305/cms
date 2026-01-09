
import React, { useState, useEffect } from 'react';
import { db } from '../store';
import { Lesson, Status, Role, ContentType, AssetType, AssetVariant } from '../types';

interface LessonEditorProps {
  id: string;
  onBack: () => void;
  role: Role;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const LessonEditor: React.FC<LessonEditorProps> = ({ id, onBack, role, showToast }) => {
  const [lesson, setLesson] = useState<Lesson | undefined>(db.getLesson(id));
  const [programTitle, setProgramTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'publishing'>('details');

  useEffect(() => {
    if (lesson) {
      const term = db.getTerm(lesson.term_id);
      if (term) {
        const program = db.getProgram(term.program_id);
        if (program) setProgramTitle(program.title);
      }
    }
  }, [lesson]);

  if (!lesson) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Lesson identifier not found</div>;

  const assets = db.getAssets(id);

  const validateForPublish = () => {
    const errors: string[] = [];
    
    // Check required thumbnails for primary language
    const primaryAssets = assets.filter(a => a.language === lesson.content_language_primary && a.asset_type === AssetType.THUMBNAIL);
    const hasPortrait = primaryAssets.some(a => a.variant === AssetVariant.PORTRAIT);
    const hasLandscape = primaryAssets.some(a => a.variant === AssetVariant.LANDSCAPE);

    if (!hasPortrait) errors.push("Missing primary portrait thumbnail.");
    if (!hasLandscape) errors.push("Missing primary landscape thumbnail.");
    
    if (lesson.content_type === ContentType.VIDEO && (!lesson.duration_ms || lesson.duration_ms <= 0)) {
        errors.push("Video content requires a valid duration in ms.");
    }

    const primaryUrl = lesson.content_urls_by_language[lesson.content_language_primary];
    if (!primaryUrl) {
        errors.push("Primary content URL is required.");
    }

    return errors;
  };

  const handleUpdate = () => {
    try {
      db.updateLesson(lesson);
      showToast?.('Draft saved', 'success');
    } catch (e: any) {
      showToast?.(e.message, 'error');
    }
  };

  const handlePublishNow = () => {
    const errors = validateForPublish();
    if (errors.length > 0) {
      showToast?.(`Cannot publish: ${errors[0]}`, 'error');
      return;
    }

    const updated = { 
        ...lesson, 
        status: Status.PUBLISHED, 
        published_at: lesson.published_at || new Date().toISOString() 
    };
    try {
        db.updateLesson(updated);
        setLesson(updated);
        showToast?.('Module is now LIVE', 'success');
    } catch (e: any) {
        showToast?.(e.message, 'error');
    }
  };

  const handleSchedule = () => {
      if (!lesson.publish_at) {
          showToast?.("Set a release time before scheduling.", "error");
          return;
      }
      const updated = { ...lesson, status: Status.SCHEDULED };
      try {
          db.updateLesson(updated);
          setLesson(updated);
          showToast?.("Lesson scheduled for release.", "success");
      } catch (e: any) {
          showToast?.(e.message, "error");
      }
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
        <button onClick={onBack} className="hover:text-amber-600 transition-colors">Library</button>
        <span>/</span>
        <button onClick={onBack} className="hover:text-amber-600 transition-colors">{programTitle || 'Program'}</button>
        <span>/</span>
        <span className="text-slate-900">{lesson.title}</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack} 
            className="p-4 hover:bg-black hover:text-white bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm transition-all"
            title="Back to Curriculum"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">{lesson.title}</h2>
            <div className="flex items-center space-x-4 mt-3">
              <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest shadow-sm ${
                lesson.status === Status.PUBLISHED ? 'bg-green-500 text-white' : 
                lesson.status === Status.SCHEDULED ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
              }`}>{lesson.status}</span>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">UNIT #{lesson.lesson_number} • {lesson.content_type.toUpperCase()}</span>
            </div>
          </div>
        </div>
        
        {role !== Role.VIEWER && (
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleUpdate}
              className="px-6 py-4 text-slate-700 font-black bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all uppercase text-xs tracking-widest"
            >
              Save Draft
            </button>
            {lesson.status !== Status.PUBLISHED && (
                <>
                    <button 
                        onClick={handleSchedule}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest"
                    >
                        Schedule
                    </button>
                    <button 
                        onClick={handlePublishNow}
                        className="bg-green-600 hover:bg-green-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-green-200 transition-all transform active:scale-95 uppercase text-xs tracking-widest"
                    >
                        Publish Now
                    </button>
                </>
            )}
          </div>
        )}
      </header>

      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-[2rem] w-fit border border-slate-200/60 shadow-inner">
        {[
          { id: 'details', label: 'General Details' },
          { id: 'media', label: 'Media & Assets' },
          { id: 'publishing', label: 'Scheduling & Archive' }
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

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
        {activeTab === 'details' && (
          <div className="p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Module Title</label>
                  <input 
                    type="text" value={lesson.title} 
                    disabled={role === Role.VIEWER}
                    onChange={(e) => setLesson({...lesson, title: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none font-black text-slate-900 transition-all uppercase tracking-tight"
                  />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Type</label>
                    <div className="relative">
                      <select 
                        value={lesson.content_type} 
                        disabled={role === Role.VIEWER}
                        onChange={(e) => setLesson({...lesson, content_type: e.target.value as any})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 appearance-none uppercase tracking-widest cursor-pointer"
                      >
                        <option value={ContentType.VIDEO}>Video Short</option>
                        <option value={ContentType.ARTICLE}>Read Article</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (MS)</label>
                    <input 
                      type="number" value={lesson.duration_ms || 0} 
                      disabled={role === Role.VIEWER}
                      onChange={(e) => setLesson({...lesson, duration_ms: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-900 transition-all uppercase tracking-widest"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-10">
                <div className={`p-10 rounded-[2.5rem] border-2 transition-all shadow-sm ${
                  lesson.is_paid ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-start space-x-6">
                    <div className="relative">
                       <input 
                        type="checkbox" checked={lesson.is_paid} 
                        disabled={role === Role.VIEWER}
                        onChange={(e) => setLesson({...lesson, is_paid: e.target.checked})}
                        className="w-8 h-8 rounded-xl text-amber-600 border-2 border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="font-black text-xl text-slate-900 block uppercase tracking-tighter leading-none">Premium Content</span>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-3">
                        When enabled, users will require an active subscription to access this content on public apps.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-12 space-y-16">
            <section>
              <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Visual Thumbnails</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Previews for different app layouts and platform types.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                {[AssetVariant.PORTRAIT, AssetVariant.LANDSCAPE, AssetVariant.SQUARE].map(variant => {
                  const asset = assets.find(a => a.variant === variant && a.asset_type === AssetType.THUMBNAIL);
                  return (
                    <div key={variant} className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{variant}</label>
                      <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] overflow-hidden relative group hover:border-amber-400 transition-all hover:shadow-2xl hover:shadow-amber-100/50">
                        {asset ? <img src={asset.url} alt={variant} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Missing</div>}
                        {role !== Role.VIEWER && (
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[4px] transition-all">
                            <button onClick={() => {
                              const url = prompt('Thumbnail URL:', asset?.url || '');
                              if (url !== null) {
                                db.upsertAsset({ parent_id: id, language: lesson.content_language_primary, variant, asset_type: AssetType.THUMBNAIL, url });
                                showToast?.('Thumbnail updated', 'success');
                                setLesson({...lesson});
                              }
                            }} className="bg-amber-400 text-black px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-all">Link Artwork</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            
            <section>
              <div className="mb-10">
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Asset Hosting</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Primary and localized resource streams for the media player.</p>
              </div>
              
              <div className="bg-slate-50 rounded-[3rem] border-2 border-slate-100 overflow-hidden shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-10 py-6">Track Identity</th>
                      <th className="px-10 py-6">Secure CDN Endpoint URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lesson.content_languages_available.map(lang => (
                      <tr key={lang} className="hover:bg-white transition-colors">
                        <td className="px-10 py-6 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                             <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-slate-500 shadow-sm uppercase">{lang}</div>
                             {lang === lesson.content_language_primary && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded uppercase tracking-widest border border-amber-200 shadow-sm">Main</span>}
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <input 
                            type="text" 
                            value={lesson.content_urls_by_language[lang] || ''} 
                            disabled={role === Role.VIEWER}
                            onChange={(e) => {
                              const updated = { ...lesson.content_urls_by_language, [lang]: e.target.value };
                              setLesson({...lesson, content_urls_by_language: updated});
                            }}
                            className="w-full text-sm bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 outline-none focus:border-amber-400 transition-all font-medium text-slate-700"
                            placeholder="https://cdn.chaishorts.com/stream/..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'publishing' && (
          <div className="p-12">
             <div className="max-w-3xl bg-amber-50/50 p-12 rounded-[3.5rem] border-2 border-amber-100 shadow-xl shadow-amber-100/20">
               <div className="flex items-center space-x-6 mb-10">
                 <div className="bg-amber-400 p-4 rounded-3xl text-black shadow-lg">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Automated Release</h3>
                    <p className="text-slate-500 font-medium">Set a target timestamp for the module to go live.</p>
                 </div>
               </div>
               
               <div className="space-y-10">
                 <div className="space-y-4">
                   <label className="block text-[10px] font-black text-amber-800 uppercase tracking-[0.2em] ml-1">Go-Live Timestamp</label>
                   <input 
                    type="datetime-local" 
                    disabled={role === Role.VIEWER}
                    value={lesson.publish_at ? new Date(lesson.publish_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      setLesson({...lesson, publish_at: e.target.value});
                    }}
                    className="w-full bg-white border-2 border-amber-200 rounded-[2rem] py-5 px-8 focus:ring-8 focus:ring-amber-200/30 outline-none font-black text-amber-900 shadow-sm transition-all"
                   />
                 </div>
                 
                 <div className="flex items-start space-x-4 p-8 bg-white/60 rounded-[2.5rem] border border-amber-100 shadow-inner">
                   <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-black shrink-0 shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <p className="text-xs text-amber-800 font-bold leading-relaxed mt-1">
                     The <span className="font-black text-black">Scheduler</span> will process this record automatically at the specified time. 
                     All media links and artwork MUST be finalized.
                   </p>
                 </div>

                 {lesson.status !== Status.ARCHIVED && (
                   <div className="pt-10 mt-10 border-t border-amber-100 flex items-center justify-between">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End of lifecycle actions</p>
                     <button 
                      onClick={() => {
                        if (confirm('Move to Archive? This module will be immediately removed from the catalog.')) {
                          const updated = { ...lesson, status: Status.ARCHIVED };
                          setLesson(updated);
                          db.updateLesson(updated);
                          showToast?.('Moved to Archive', 'info');
                        }
                      }}
                      className="text-red-600 font-black hover:bg-red-50 px-8 py-4 rounded-2xl transition-all inline-flex items-center space-x-3 uppercase text-[10px] tracking-widest border border-transparent hover:border-red-100 shadow-sm"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       <span>Archive Lesson</span>
                     </button>
                   </div>
                 )}
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonEditor;
