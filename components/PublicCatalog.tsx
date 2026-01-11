
import React, { useState, useEffect } from 'react';

interface CatalogResponse {
    data: any[];
    pagination: {
        next_cursor: number | null;
        total: number;
        limit: number;
    }
}

interface DebugStats {
    programs: { status: string; count: string }[];
    lessons: { status: string; count: string }[];
}

const PublicCatalog: React.FC = () => {
  const [cursor, setCursor] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState<CatalogResponse | null>(null);
  const [debugStats, setDebugStats] = useState<DebugStats | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const limit = 4;

  const fetchData = async (currentCursor: number) => {
    setIsLoading(true);
    try {
      // 1. Fetch Catalog
      const res = await fetch(`/catalog/programs?cursor=${currentCursor}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setApiResponse(data);
      }

      // 2. Fetch Debug Stats
      const statsRes = await fetch(`/api/debug/stats`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setDebugStats(stats);
      }
    } catch (err) {
      console.error("Failed to fetch public catalog", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepair = async () => {
    setIsBootstrapping(true);
    try {
      await fetch('/api/debug/bootstrap', { method: 'POST' });
      await fetchData(cursor);
    } catch (err) {
      console.error("Repair failed", err);
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    fetchData(cursor);
  }, [cursor]);

  if (isLoading && !apiResponse) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Calling Public API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen text-white font-sans selection:bg-amber-500 selection:text-white pb-32">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800 pb-12 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-amber-600 text-white p-2 rounded-xl font-bold tracking-tighter">CS</div>
              <span className="font-extrabold text-2xl tracking-tighter text-white">Chaishorts API</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-tight">Public Catalog Explorer</h1>
            <p className="text-slate-400 mt-6 text-xl font-medium max-w-2xl leading-relaxed">
              Real-time feed of published programs. Access high-quality content via robust JSON endpoints.
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <code className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-amber-500 font-bold text-sm">
              GET /catalog/programs?cursor={cursor}
            </code>
            <div className="flex space-x-3">
                <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">● API Online</span>
                <button 
                  onClick={() => fetchData(cursor)} 
                  className="text-[10px] text-slate-500 hover:text-white font-black uppercase tracking-widest"
                >
                  Refresh
                </button>
                <button 
                  disabled={isBootstrapping}
                  onClick={handleRepair} 
                  className="text-[10px] text-red-500 hover:text-red-400 font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {isBootstrapping ? 'Repairing...' : 'Repair System'}
                </button>
            </div>
          </div>
        </header>

        {/* Debug Stats Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Published Programs</span>
                <p className="text-3xl font-black text-white mt-2">{apiResponse?.pagination.total || 0}</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Draft Programs</span>
                <p className="text-3xl font-black text-slate-700 mt-2">{debugStats?.programs.find(p => p.status === 'draft')?.count || 0}</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Published Lessons</span>
                <p className="text-3xl font-black text-white mt-2">{debugStats?.lessons.find(l => l.status === 'published')?.count || 0}</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduled Tasks</span>
                <p className="text-3xl font-black text-amber-500 mt-2">{debugStats?.lessons.find(l => l.status === 'scheduled')?.count || 0}</p>
            </div>
        </div>

        <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-3xl overflow-hidden relative">
          <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-6">
            <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 font-mono text-xs text-slate-500 uppercase tracking-widest">application/json</span>
            </div>
            <div className="flex space-x-2">
                <button 
                    disabled={cursor === 0 || isLoading}
                    onClick={() => setCursor(Math.max(0, cursor - limit))}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold disabled:opacity-30 transition-colors"
                >
                    PREV
                </button>
                <button 
                    disabled={!apiResponse?.pagination.next_cursor || isLoading}
                    onClick={() => setCursor(apiResponse!.pagination.next_cursor!)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold disabled:opacity-30 transition-colors"
                >
                    NEXT
                </button>
            </div>
          </div>
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <pre className="text-sm font-mono text-amber-200/90 overflow-auto max-h-[400px] leading-relaxed custom-scrollbar p-2">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        </section>

        <section className="space-y-12">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black italic">Live Content Preview</h3>
            <div className="flex items-center space-x-4">
               <span className="bg-white text-slate-950 px-4 py-1.5 rounded-full text-xs font-black uppercase shadow-lg">Published Only</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {apiResponse?.data.map(p => (
              <div key={p.id} className="group relative rounded-[2rem] overflow-hidden shadow-2xl bg-slate-900 hover:ring-4 ring-amber-600/50 transition-all duration-500">
                <div className="aspect-[3/5] relative">
                  <img 
                    src={p.posters?.portrait || `https://picsum.photos/400/600?seed=${p.id}`} 
                    alt={p.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                  
                  <div className="absolute bottom-0 p-8 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {p.topics?.map((t: string) => (
                        <span key={t} className="text-[9px] bg-amber-600 px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">{t}</span>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black mb-2 leading-tight uppercase tracking-tight">{p.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 font-medium leading-relaxed">{p.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {apiResponse?.data.length === 0 && !isLoading && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[3rem]">
                <p className="font-black text-slate-500 uppercase tracking-widest text-sm mb-4">No published content found in database.</p>
                <div className="flex flex-col items-center gap-4">
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest max-w-sm mx-auto">
                    Verify the Admin panel has published programs AND published lessons. 
                    Alternatively, use the "Repair System" button above to deploy starter data.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PublicCatalog;
