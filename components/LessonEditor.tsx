
import React, { useState } from 'react';
import { db } from '../store';
import { Lesson, Status, Role, ContentType, AssetType, AssetVariant } from '../types';

interface LessonEditorProps {
  id: string;
  onBack: () => void;
  role: Role;
}

const LessonEditor: React.FC<LessonEditorProps> = ({ id, onBack, role }) => {
  const [lesson, setLesson] = useState<Lesson | undefined>(db.getLesson(id));
  const assets = db.getAssets(id);
  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'publishing'>('details');

  if (!lesson) return <div>Lesson not found</div>;

  const handleUpdate = () => {
    db.updateLesson(lesson);
    alert('Lesson progress saved.');
  };

  const handleDeleteLesson = () => {
    if (confirm('Permanently delete this lesson?')) {
      db.deleteLesson(id);
      onBack();
    }
  };

  const handlePublishNow = () => {
    // Validate assets
    const primaryAssets = assets.filter(a => a.language === lesson.content_language_primary && a.asset_type === AssetType.THUMBNAIL);
    const hasPortrait = primaryAssets.some(a => a.variant === AssetVariant.PORTRAIT);
    const hasLandscape = primaryAssets.some(a => a.variant === AssetVariant.LANDSCAPE);

    if (!hasPortrait || !hasLandscape) {
      alert(`Asset Requirement: Provide both Portrait & Landscape thumbnails for ${lesson.content_language_primary} before publishing.`);
      return;
    }

    const updated = { ...lesson, status: Status.PUBLISHED, published_at: new Date().toISOString() };
    setLesson(updated);
    db.updateLesson(updated);
    alert('Live on Chaishorts!');
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <button 
            onClick={onBack} 
            className="p-3 hover:bg-white bg-slate-100 rounded-2xl text-slate-600 shadow-sm transition-all hover:text-amber-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{lesson.title}</h2>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-3 py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider ${
                lesson.status === Status.PUBLISHED ? 'bg-green-100 text-green-700' : 
                lesson.status === Status.SCHEDULED ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>{lesson.status}</span>
              <span className="text-slate-400 text-xs font-medium">L# {lesson.lesson_number} • {lesson.content_type.toUpperCase()}</span>
            </div>
          </div>
        </div>
        
        {role !== Role.VIEWER && (
          <div className="flex items-center space-x-3">
             <button 
              onClick={handleDeleteLesson}
              className="px-6 py-3 text-red-600 font-bold bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              Delete
            </button>
            <button 
              onClick={handleUpdate}
              className="px-6 py-3 text-slate-700 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Save Draft
            </button>
            <button 
              onClick={handlePublishNow}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-green-200 transition-all"
            >
              Go Live
            </button>
          </div>
        )}
      </header>

      <div className="flex space-x-1 bg-slate-200 p-1.5 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('details')} className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'details' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>General</button>
        <button onClick={() => setActiveTab('media')} className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'media' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Thumbnails & Links</button>
        <button onClick={() => setActiveTab('publishing')} className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'publishing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Publishing</button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        {activeTab === 'details' && (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Lesson Title</label>
                  <input 
                    type="text" value={lesson.title} 
                    disabled={role === Role.VIEWER}
                    onChange={(e) => setLesson({...lesson, title: e.target.value})}
                    className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Content Type</label>
                    <select 
                      value={lesson.content_type} 
                      disabled={role === Role.VIEWER}
                      onChange={(e) => setLesson({...lesson, content_type: e.target.value as any})}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-bold"
                    >
                      <option value={ContentType.VIDEO}>Video Short</option>
                      <option value={ContentType.ARTICLE}>Read Article</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Duration (ms)</label>
                    <input 
                      type="number" value={lesson.duration_ms || 0} 
                      disabled={role === Role.VIEWER}
                      onChange={(e) => setLesson({...lesson, duration_ms: parseInt(e.target.value)})}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl border-2 transition-all ${
                  lesson.is_paid ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-start space-x-4">
                    <input 
                      type="checkbox" checked={lesson.is_paid} 
                      disabled={role === Role.VIEWER}
                      onChange={(e) => setLesson({...lesson, is_paid: e.target.checked})}
                      className="w-6 h-6 mt-1 rounded-lg text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-extrabold text-slate-900 block">Premium Asset</span>
                      <span className="text-xs text-slate-500 font-medium leading-relaxed block mt-1">Users will need an active subscription to access this content on the mobile app.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-8 space-y-12">
            <section>
              <div className="mb-6">
                <h3 className="text-xl font-extrabold text-slate-900">Visual Thumbnails</h3>
                <p className="text-sm text-slate-500 mt-1">Provide previews for different app layouts.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[AssetVariant.PORTRAIT, AssetVariant.LANDSCAPE, AssetVariant.SQUARE].map(variant => {
                  const asset = assets.find(a => a.variant === variant && a.asset_type === AssetType.THUMBNAIL);
                  return (
                    <div key={variant} className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{variant}</label>
                      <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden relative group hover:border-amber-300">
                        {asset ? <img src={asset.url} alt={variant} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px]">No Thumbnail</div>}
                        {role !== Role.VIEWER && (
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-sm transition-all">
                            <button onClick={() => {
                              const url = prompt('Thumbnail URL:', asset?.url || '');
                              if (url !== null) {
                                db.upsertAsset({ parent_id: id, language: lesson.content_language_primary, variant, asset_type: AssetType.THUMBNAIL, url });
                                setLesson({...lesson});
                              }
                            }} className="bg-white text-slate-900 px-5 py-2 rounded-xl text-xs font-black shadow-xl">Update</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            
            <section>
              <div className="mb-6">
                <h3 className="text-xl font-extrabold text-slate-900">Content Storage</h3>
                <p className="text-sm text-slate-500 mt-1">Primary and secondary stream URLs for the player.</p>
              </div>
              
              <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Track</th>
                      <th className="px-6 py-4">Resource URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lesson.content_languages_available.map(lang => (
                      <tr key={lang}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-black text-xs ${lang === lesson.content_language_primary ? 'text-amber-600' : 'text-slate-500'}`}>
                            {lang.toUpperCase()} {lang === lesson.content_language_primary && <span className="bg-amber-100 text-[9px] px-1.5 py-0.5 rounded-md ml-2">PRIMARY</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            value={lesson.content_urls_by_language[lang] || ''} 
                            disabled={role === Role.VIEWER}
                            onChange={(e) => {
                              const updated = { ...lesson.content_urls_by_language, [lang]: e.target.value };
                              setLesson({...lesson, content_urls_by_language: updated});
                            }}
                            className="w-full text-sm bg-white border border-slate-200 rounded-lg py-2 px-3 outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                            placeholder="https://cdn.chaishorts.com/..."
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
          <div className="p-8">
             <div className="max-w-2xl bg-amber-50 p-8 rounded-3xl border border-amber-200">
               <div className="flex items-center space-x-3 mb-6">
                 <div className="bg-amber-600 p-2 rounded-lg text-white">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <h3 className="text-xl font-extrabold text-amber-900">Scheduled Release</h3>
               </div>
               
               <div className="space-y-6">
                 <div>
                   <label className="block text-sm font-bold text-amber-800 mb-3 uppercase tracking-wider">Release Timestamp</label>
                   <input 
                    type="datetime-local" 
                    disabled={role === Role.VIEWER}
                    value={lesson.publish_at ? new Date(lesson.publish_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setLesson({...lesson, publish_at: e.target.value, status: Status.SCHEDULED})}
                    className="w-full bg-white border-amber-200 rounded-2xl py-4 px-6 focus:ring-4 focus:ring-amber-200 outline-none font-extrabold text-amber-900 shadow-sm"
                   />
                 </div>
                 
                 <div className="flex items-start space-x-3 p-4 bg-white/50 rounded-2xl border border-amber-100">
                   <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <p className="text-xs text-amber-700 font-medium leading-relaxed">
                     When you set a schedule, the status changes to <span className="font-black">SCHEDULED</span>. 
                     Our background worker checks every minute to publish these automatically.
                   </p>
                 </div>

                 {lesson.status !== Status.ARCHIVED && (
                   <div className="pt-6 mt-6 border-t border-amber-100">
                     <button 
                      onClick={() => {
                        if (confirm('Move to Archive? This removes it from the catalog immediately.')) {
                          const updated = { ...lesson, status: Status.ARCHIVED };
                          setLesson(updated);
                          db.updateLesson(updated);
                        }
                      }}
                      className="text-red-600 font-black hover:bg-red-50 px-6 py-3 rounded-xl transition-all inline-flex items-center space-x-2"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
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
