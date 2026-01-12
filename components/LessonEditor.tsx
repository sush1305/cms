import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../store';
import { Lesson, Status, Role, ContentType, AssetType, AssetVariant, Program, Asset } from '../types';

interface LessonEditorProps {
  id: string;
  onBack: () => void;
  role: Role;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const LessonEditor: React.FC<LessonEditorProps> = ({ id, onBack, role, showToast }) => {
  const [lesson, setLesson] = useState<Lesson | undefined>(db.getLesson(id));
  const [parentProgram, setParentProgram] = useState<Program | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'publishing'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssetParams, setSelectedAssetParams] = useState<{variant: AssetVariant, type: AssetType} | null>(null);

  useEffect(() => {
    if (lesson) {
      const term = db.getTerm(lesson.term_id);
      if (term) {
        const program = db.getProgram(term.program_id);
        if (program) setParentProgram(program);
      }
    }
  }, [lesson]);

  const assets = useMemo(() => db.getAssets(id), [id, refreshKey]);

  if (!lesson) return (
    <div className="p-20 text-center flex flex-col items-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
         <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Lesson not found</p>
      <button onClick={onBack} className="mt-6 text-amber-600 font-bold uppercase text-xs">Return to Library</button>
    </div>
  );

  const handleUpdate = async () => {
    setIsProcessing(true);
    try {
      await db.updateLesson(lesson);
      showToast?.('Module draft synchronized', 'success');
    } catch (e: any) {
      showToast?.(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssetFileUpload = (variant: AssetVariant, type: AssetType) => {
    if (role === Role.VIEWER) return;
    setSelectedAssetParams({ variant, type });
    assetFileInputRef.current?.click();
  };

  const onAssetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedAssetParams) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        try {
          await db.upsertAsset({ 
            parent_id: id, 
            language: lesson.content_language_primary, 
            variant: selectedAssetParams.variant, 
            asset_type: selectedAssetParams.type, 
            url 
          });
          showToast?.(`${selectedAssetParams.type} (${selectedAssetParams.variant}) uploaded`, 'success');
          setRefreshKey(prev => prev + 1);
        } catch (err) {
          showToast?.('Upload failed', 'error');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleUrlUpdate = async (variant: AssetVariant, type: AssetType, url: string) => {
    if (role === Role.VIEWER || !url.trim()) return;
    setIsProcessing(true);
    try {
      await db.upsertAsset({ 
        parent_id: id, 
        language: lesson.content_language_primary, 
        variant, 
        asset_type: type, 
        url 
      });
      showToast?.('Resource link updated', 'success');
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      showToast?.('Link update failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleLanguageAvailability = (lang: string, field: 'content' | 'subtitle') => {
    const listField = field === 'content' ? 'content_languages_available' : 'subtitle_languages';
    const currentList = lesson[listField];
    if (lang === lesson.content_language_primary && field === 'content') return;
    const newList = currentList.includes(lang) ? currentList.filter(l => l !== lang) : [...currentList, lang];
    setLesson({ ...lesson, [listField]: newList });
  };

  const formatDateTimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
  };

  return (
    <div className={`space-y-8 pb-20 animate-fade-in ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}>
      <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
        <button onClick={onBack} className="hover:text-amber-600 transition-colors">Library</button>
        <span>/</span>
        <button onClick={onBack} className="hover:text-amber-600 transition-colors">{parentProgram?.title}</button>
        <span>/</span>
        <span className="text-slate-900">{lesson.title}</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <button onClick={onBack} className="p-4 hover:bg-black hover:text-white bg-white border border-slate-200 rounded-2xl text-slate-600 shadow-sm transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">{lesson.title}</h2>
            <div className="flex items-center space-x-4 mt-3">
              <span className={`px-2.5 py-1 text-[9px] font-black text-white rounded-lg uppercase tracking-widest ${
                lesson.status === Status.PUBLISHED ? 'bg-green-600' :
                lesson.status === Status.SCHEDULED ? 'bg-amber-600' : 'bg-slate-400'
              }`}>{lesson.status}</span>
            </div>
          </div>
        </div>
        
        {role !== Role.VIEWER && (
          <button onClick={handleUpdate} className="bg-black hover:bg-slate-800 text-amber-400 font-black py-4 px-10 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest flex items-center space-x-2">
            {isProcessing && <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>}
            <span>Save Draft</span>
          </button>
        )}
      </header>

      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-[2rem] w-fit border border-slate-200/60 shadow-inner">
        {['details', 'media', 'publishing'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)} 
            className={`px-10 py-3.5 rounded-[1.5rem] font-black transition-all text-[10px] uppercase tracking-widest ${activeTab === tab ? 'bg-white text-black shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'details' ? 'Standard Info' : tab === 'media' ? 'Media & Assets' : 'Publishing'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
        {activeTab === 'details' && (
          <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Module Title</label>
              <input 
                type="text" 
                value={lesson.title} 
                onChange={(e) => setLesson({...lesson, title: e.target.value})} 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:border-amber-400 outline-none font-black text-slate-900 transition-all shadow-sm" 
              />
            </div>
            <div className="space-y-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Content Format</label>
              <select 
                value={lesson.content_type} 
                onChange={(e) => setLesson({...lesson, content_type: e.target.value as any})} 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 outline-none font-black text-slate-900 uppercase cursor-pointer"
              >
                <option value={ContentType.VIDEO}>Multimedia Video</option>
                <option value={ContentType.ARTICLE}>Interactive Article</option>
              </select>
            </div>
            <div className="space-y-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Monetization</label>
              <div className="flex items-center space-x-4 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                <input 
                  type="checkbox" 
                  checked={lesson.is_paid} 
                  onChange={(e) => setLesson({...lesson, is_paid: e.target.checked})}
                  className="w-6 h-6 rounded-lg text-amber-500 focus:ring-amber-500 border-slate-300"
                />
                <span className="font-bold text-slate-700">Premium Content (Requires Subscription)</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-12 space-y-16">
            <input type="file" ref={assetFileInputRef} onChange={onAssetFileChange} accept="image/*" className="hidden" />
            
            <section>
              <h3 className="text-2xl font-black uppercase mb-8 border-b border-slate-100 pb-4">Localized Streams</h3>
              <div className="bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-10 py-6">Language</th>
                      <th className="px-10 py-6">Content Endpoint</th>
                      <th className="px-10 py-6">Subtitle Track</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parentProgram?.languages_available.map(lang => {
                      const hasContent = lesson.content_languages_available.includes(lang);
                      const hasSubtitle = lesson.subtitle_languages.includes(lang);
                      return (
                        <tr key={lang} className="group hover:bg-white/50 transition-colors">
                          <td className="px-10 py-8">
                            <div className="font-black text-slate-900 uppercase mb-3">{lang}</div>
                            <div className="flex flex-col gap-3">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={hasContent} onChange={() => toggleLanguageAvailability(lang, 'content')} className="w-4 h-4 rounded text-amber-500" />
                                <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-600">Video</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={hasSubtitle} onChange={() => toggleLanguageAvailability(lang, 'subtitle')} className="w-4 h-4 rounded text-amber-500" />
                                <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-600">Subs</span>
                              </label>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <input 
                              type="text" 
                              placeholder="https://cdn.example.com/stream..."
                              value={lesson.content_urls_by_language[lang] || ''} 
                              disabled={!hasContent} 
                              onChange={(e) => setLesson({...lesson, content_urls_by_language: {...lesson.content_urls_by_language, [lang]: e.target.value}})} 
                              className="w-full text-xs border-2 border-slate-200 focus:border-amber-400 rounded-xl py-3 px-5 bg-white disabled:bg-slate-100 disabled:opacity-50 transition-all font-medium" 
                            />
                          </td>
                          <td className="px-10 py-8">
                            <input 
                              type="text" 
                              placeholder="https://cdn.example.com/vtt..."
                              value={lesson.subtitle_urls_by_language[lang] || ''} 
                              disabled={!hasSubtitle} 
                              onChange={(e) => setLesson({...lesson, subtitle_urls_by_language: {...lesson.subtitle_urls_by_language, [lang]: e.target.value}})} 
                              className="w-full text-xs border-2 border-slate-200 focus:border-amber-400 rounded-xl py-3 px-5 bg-white disabled:bg-slate-100 disabled:opacity-50 transition-all font-medium" 
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-black uppercase mb-8 border-b border-slate-100 pb-4">Visual Assets</h3>
              <div className="space-y-12">
                {[AssetVariant.PORTRAIT, AssetVariant.LANDSCAPE, AssetVariant.SQUARE, AssetVariant.BANNER].map(variant => (
                  <div key={variant} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {[AssetType.POSTER, AssetType.THUMBNAIL].map(type => {
                      const asset = assets.find(a => a.variant === variant && a.asset_type === type);
                      const [tempUrl, setTempUrl] = useState(asset?.url || '');
                      
                      return (
                        <div key={`${variant}-${type}`} className="bg-slate-50 p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-8 border border-slate-100 group">
                          <div className={`w-full md:w-40 h-40 bg-white rounded-3xl border-2 border-white shadow-md flex-shrink-0 relative overflow-hidden flex items-center justify-center transition-all ${asset ? 'p-0' : 'p-4'}`}>
                            {asset ? (
                              <img src={asset.url} className="w-full h-full object-cover" alt={`${variant} ${type}`} />
                            ) : (
                              <div className="text-center">
                                <svg className="w-8 h-8 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest">No Image</span>
                              </div>
                            )}
                            <button 
                              onClick={() => handleAssetFileUpload(variant, type)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                                <span className="text-[10px] font-black text-white uppercase tracking-widest bg-amber-600 px-4 py-2 rounded-full">Change</span>
                            </button>
                          </div>
                          
                          <div className="flex-grow space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">{variant} {type}</h4>
                              {asset && <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">Active</span>}
                            </div>
                            
                            <div className="space-y-4">
                              <div className="relative">
                                <input 
                                  type="text" 
                                  placeholder="Enter Image URL..."
                                  value={tempUrl}
                                  onChange={(e) => setTempUrl(e.target.value)}
                                  className="w-full text-xs border-2 border-slate-200 focus:border-amber-400 rounded-2xl py-3 px-5 bg-white font-medium"
                                />
                                {tempUrl !== (asset?.url || '') && (
                                  <button 
                                    onClick={() => handleUrlUpdate(variant, type, tempUrl)}
                                    className="absolute right-2 top-1.5 bottom-1.5 bg-black text-white px-4 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all"
                                  >
                                    Apply
                                  </button>
                                )}
                              </div>
                              
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handleAssetFileUpload(variant, type)} 
                                  className="flex-1 bg-amber-400 hover:bg-amber-500 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-md shadow-amber-200 transition-all"
                                >
                                  Upload Photo
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'publishing' && (
          <div className="p-12">
            <div className="max-w-2xl bg-slate-50 p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-inner">
              <h3 className="text-2xl font-black uppercase mb-8 flex items-center space-x-3">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                <span>Automated Lifecycle</span>
              </h3>
              
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Visibility Status</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[Status.DRAFT, Status.SCHEDULED, Status.PUBLISHED, Status.ARCHIVED].map(s => (
                      <button 
                        key={s}
                        onClick={() => setLesson({...lesson, status: s})}
                        className={`py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                          lesson.status === s ? 'bg-black border-black text-amber-400 shadow-xl' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`space-y-4 transition-all ${lesson.status !== Status.SCHEDULED ? 'opacity-30 pointer-events-none' : ''}`}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Publication Timestamp</label>
                  <input 
                    type="datetime-local" 
                    value={formatDateTimeLocal(lesson.publish_at)} 
                    onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                            setLesson({...lesson, publish_at: undefined});
                            return;
                        }
                        try {
                            const date = new Date(val);
                            if (!isNaN(date.getTime())) {
                                setLesson({...lesson, publish_at: date.toISOString()});
                            }
                        } catch (err) {
                            // Suppress invalid date errors from partial entry
                        }
                    }} 
                    className="w-full bg-white border-2 border-slate-200 focus:border-amber-400 rounded-2xl py-5 px-8 font-black outline-none shadow-sm" 
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest px-2">The background worker will automatically flip the status at this exact moment.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonEditor;
