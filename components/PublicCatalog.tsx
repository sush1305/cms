
import React, { useMemo } from 'react';
import { db } from '../store';
import { Status, CatalogProgram, AssetType } from '../types';

const PublicCatalog: React.FC = () => {
  const catalogData = useMemo(() => {
    const publishedPrograms = db.getPrograms().filter(p => p.status === Status.PUBLISHED);
    const topics = db.getTopics();
    
    // Valid catalog programs must have at least 1 published lesson
    return publishedPrograms.map(p => {
      const pTerms = db.getTerms(p.id).map(t => t.id);
      const hasPublishedLesson = db.getLessons('').some(l => pTerms.includes(l.term_id) && l.status === Status.PUBLISHED);
      
      const assets = db.getAssets(p.id).filter(a => a.asset_type === AssetType.POSTER);
      const posterMap: Record<string, Record<string, string>> = {};
      
      assets.forEach(a => {
        if (!posterMap[a.language]) posterMap[a.language] = {};
        posterMap[a.language][a.variant] = a.url;
      });

      return {
        ...p,
        topics: p.topic_ids.map(tid => topics.find(t => t.id === tid)?.name || ''),
        assets: { posters: posterMap }
      } as CatalogProgram;
    }).filter(p => {
        // Double check published lesson constraint
        const pTerms = db.getTerms(p.id).map(t => t.id);
        return db.getLessons('').some(l => pTerms.includes(l.term_id) && l.status === Status.PUBLISHED);
    }).sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
  }, []);

  return (
    <div className="bg-slate-950 min-h-screen text-white font-sans selection:bg-amber-500 selection:text-white">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800 pb-12 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-amber-600 text-white p-2 rounded-xl font-bold tracking-tighter">CS</div>
              <span className="font-extrabold text-2xl tracking-tighter">Chaishorts API</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-tight">Public Catalog Explorer</h1>
            <p className="text-slate-400 mt-6 text-xl font-medium max-w-2xl leading-relaxed">
              Real-time feed of published snackable programs. Access our mobile-first education content via direct JSON endpoints.
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <code className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-amber-500 font-bold text-sm">
              GET /catalog/v1/programs
            </code>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rate Limit: 100 req/min</span>
          </div>
        </header>

        <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-3xl overflow-hidden relative">
          <div className="flex items-center space-x-2 mb-6 border-b border-slate-800 pb-6">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-4 font-mono text-xs text-slate-500">Response Body (JSON)</span>
          </div>
          <pre className="text-sm font-mono text-amber-200/90 overflow-auto max-h-[600px] leading-relaxed custom-scrollbar">
            {JSON.stringify(catalogData, null, 2)}
          </pre>
          <div className="absolute bottom-4 right-8 text-[10px] font-black text-slate-700 uppercase tracking-widest">Chaishorts Content Engine v2.5</div>
        </section>

        <section className="space-y-12">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black italic">Live Preview</h3>
            <span className="bg-white text-slate-950 px-4 py-1.5 rounded-full text-xs font-black uppercase shadow-lg">Mobile View Simulation</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {catalogData.map(p => (
              <div key={p.id} className="group relative rounded-[2rem] overflow-hidden shadow-2xl bg-slate-900 hover:ring-4 ring-amber-600/50 transition-all duration-500">
                <div className="aspect-[3/5] relative">
                  <img 
                    src={p.assets.posters[p.language_primary]?.portrait || 'https://picsum.photos/400/600?seed=' + p.id} 
                    alt={p.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                  
                  <div className="absolute bottom-0 p-8 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {p.topics.map(t => <span key={t} className="text-[9px] bg-amber-600 px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">{t}</span>)}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black mb-2 leading-tight">{p.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 font-medium leading-relaxed">{p.description}</p>
                    </div>
                    <button className="w-full bg-white text-slate-950 py-3 rounded-2xl font-black text-sm hover:bg-amber-500 hover:text-white transition-all transform group-hover:translate-y-0 translate-y-2 opacity-0 group-hover:opacity-100 duration-500 shadow-xl">
                      Start Learning
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PublicCatalog;
