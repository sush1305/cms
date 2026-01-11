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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  if (!lesson) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Lesson identifier not found</div>;

  const handleUpdate = () => {
    try {
      db.updateLesson(lesson);
      showToast?.('Draft saved', 'success');
    } catch (e: any) {
      showToast?.(e.message, 'error');
    }
  };

  const simulateVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      showToast?.("Invalid file format. Please upload a video file.", "error");
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    const mockCdnUrl = URL.createObjectURL(file);
    const updatedUrls = { ...lesson.content_urls_by_language, [lesson.content_language_primary]: mockCdnUrl };
    const updatedLesson = { ...lesson, content_urls_by_language: updatedUrls };
    setLesson(updatedLesson);
    db.updateLesson(updatedLesson);
    setIsUploading(false);
    showToast?.("Video processed successfully", "success");
  };

  const handleAssetFileUpload = (variant: AssetVariant, type: AssetType) => {
    setSelectedAssetParams({ variant, type });
    assetFileInputRef.current?.click();
  };

  const onAssetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedAssetParams) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        db.upsertAsset({ 
          parent_id: id, 
          language: lesson.content_language_primary, 
          variant: selectedAssetParams.variant, 
          asset_type: selectedAssetParams.type, 
          url 
        });
        showToast?.('Asset uploaded', 'success');
        setRefreshKey(prev => prev + 1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlUpdate = (variant: AssetVariant, type: AssetType, url: string) => {
    db.upsertAsset({ 
      parent_id: id, 
      language: lesson.content_language_primary, 
      variant, 
      asset_type: type, 
      url 
    });
    setRefreshKey(prev => prev + 1);
  };

  const toggleLanguageAvailability = (lang: string, field: 'content' | 'subtitle') => {
    const listField = field === 'content' ? 'content_languages_available' : 'subtitle_languages';
    const currentList = lesson[listField];
    if (lang === lesson.content_language_primary && field === 'content') return;
    const newList = currentList.includes(lang) ? currentList.filter(l => l !== lang) : [...currentList, lang];
    setLesson({ ...lesson, [listField]: newList });
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
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
              <span className="px-2.5 py-1 text-[9px] font-black bg-amber-500 text-white rounded-lg uppercase tracking-widest">{lesson.status}</span>
            </div>
          </div>
        </div>
        
        {role !== Role.VIEWER && (
          <button onClick={handleUpdate} className="bg-black hover:bg-slate-800 text-amber-400 font-black py-4 px-10 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest">
            Save Draft
          </button>
        )}
      </header>

      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-[2rem] w-fit border border-slate-200/60 shadow-inner">
        {['details', 'media', 'publishing'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-10 py-3.5 rounded-[1.5rem] font-black transition-all text-[10px] uppercase tracking-widest ${activeTab === tab ? 'bg-white text-black shadow-md' : 'text-slate-500'}`}>
            {tab === 'details' ? 'Details' : tab === 'media' ? 'Media & Localization' : 'Publishing'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
        {activeTab === 'details' && (
          <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Lesson Title</label>
              <input type="text" value={lesson.title} onChange={(e) => setLesson({...lesson, title: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 focus:border-amber-400 outline-none font-black text-slate-900 transition-all" />
            </div>
            <div className="space-y-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Content Type</label>
              <select value={lesson.content_type} onChange={(e) => setLesson({...lesson, content_type: e.target.value as any})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 outline-none font-black text-slate-900 uppercase">
                <option value={ContentType.VIDEO}>Video</option>
                <option value={ContentType.ARTICLE}>Article</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-12 space-y-16">
            <input type="file" ref={assetFileInputRef} onChange={onAssetFileChange} accept="image/*" className="hidden" />
            <section>
              <h3 className="text-2xl font-black uppercase mb-6">Localized Resources</h3>
              <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-8 py-6">Lang</th>
                      <th className="px-8 py-6">Video URL</th>
                      <th className="px-8 py-6">Subtitle URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parentProgram?.languages_available.map(lang => {
                      const hasContent = lesson.content_languages_available.includes(lang);
                      const hasSubtitle = lesson.subtitle_languages.includes(lang);
                      return (
                        <tr key={lang}>
                          <td className="px-8 py-6">
                            <div className="font-black text-xs uppercase">{lang}</div>
                            <div className="flex flex-col gap-2 mt-2">
                              <label className="flex items-center gap-2"><input type="checkbox" checked={hasContent} onChange={() => toggleLanguageAvailability(lang, 'content')} /> <span className="text-[9px] font-black uppercase">Content</span></label>
                              <label className="flex items-center gap-2"><input type="checkbox" checked={hasSubtitle} onChange={() => toggleLanguageAvailability(lang, 'subtitle')} /> <span className="text-[9px] font-black uppercase">Subs</span></label>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <input type="text" value={lesson.content_urls_by_language[lang] || ''} disabled={!hasContent} onChange={(e) => setLesson({...lesson, content_urls_by_language: {...lesson.content_urls_by_language, [lang]: e.target.value}})} className="w-full text-xs border border-slate-200 rounded-xl py-2 px-4" />
                          </td>
                          <td className="px-8 py-6">
                            <input type="text" value={lesson.subtitle_urls_by_language[lang] || ''} disabled={!hasSubtitle} onChange={(e) => setLesson({...lesson, subtitle_urls_by_language: {...lesson.subtitle_urls_by_language, [lang]: e.target.value}})} className="w-full text-xs border border-slate-200 rounded-xl py-2 px-4" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-black uppercase mb-6">Visual Assets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[AssetVariant.PORTRAIT, AssetVariant.LANDSCAPE, AssetVariant.SQUARE, AssetVariant.BANNER].map(variant => {
                  const asset = assets.find(a => a.variant === variant && a.asset_type === AssetType.THUMBNAIL);
                  return (
                    <div key={variant} className="bg-slate-50 p-6 rounded-[2rem] flex gap-6 border border-slate-100">
                      <div className="w-32 h-32 bg-white rounded-2xl border flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                        {asset ? <img src={asset.url} className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-300 font-black uppercase">{variant}</span>}
                      </div>
                      <div className="flex-grow space-y-4">
                        <h4 className="font-black text-slate-900 uppercase tracking-tight">{variant} Asset</h4>
                        <div className="flex gap-2">
                          <button onClick={() => handleAssetFileUpload(variant, AssetType.THUMBNAIL)} className="flex-1 bg-amber-400 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md">Upload Photo</button>
                          <button onClick={() => handleUrlUpdate(variant, AssetType.THUMBNAIL, prompt('Asset URL:', asset?.url || '') || '')} className="flex-1 bg-slate-800 text-white py-2 rounded-xl font-black text-[9px] uppercase tracking-widest">Image URL</button>
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold truncate max-w-[150px]">{asset?.url || 'No resource linked'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'publishing' && (
          <div className="p-12">
            <div className="bg-amber-50 p-12 rounded-[3rem] border-2 border-amber-100 max-w-2xl">
              <h3 className="text-2xl font-black uppercase mb-4">Scheduling</h3>
              <input type="datetime-local" value={lesson.publish_at ? new Date(lesson.publish_at).toISOString().slice(0, 16) : ''} onChange={(e) => setLesson({...lesson, publish_at: e.target.value})} className="w-full bg-white border border-amber-200 rounded-2xl py-4 px-6 font-black" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonEditor;