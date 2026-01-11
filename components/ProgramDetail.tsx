
import React, { useState, useMemo } from 'react';
import { db } from '../store';
import { Program, Term, Status, Role, AssetType, AssetVariant } from '../types';

interface ProgramDetailProps {
  id: string;
  onBack: () => void;
  onEditLesson: (id: string) => void;
  role: Role;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ProgramDetail: React.FC<ProgramDetailProps> = ({ id, onBack, onEditLesson, role, showToast }) => {
  const [program, setProgram] = useState<Program | undefined>(db.getProgram(id));
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [activeTab, setActiveTab] = useState<'info' | 'assets' | 'content'>('content');

  const terms = useMemo(() => db.getTerms(id), [id, refreshTrigger]);
  const assets = useMemo(() => db.getAssets(id), [id, refreshTrigger]);

  if (!program) return <div className="p-20 text-center font-black text-slate-400">Program not found</div>;

  const handleUpdate = async () => {
    // Implement updateProgram API in store.ts if needed, but currently focusing on delete
    showToast?.('Update functionality not fully implemented in API yet', 'info');
  };

  const handleDeleteProgram = async () => {
    if (window.confirm(`Permanently delete "${program.title}"? This erases all nested content.`)) {
      await db.deleteProgram(id);
      showToast?.('Program deleted', 'info');
      onBack();
    }
  };

  const handleCreateTerm = async () => {
    if (role === Role.VIEWER) return;
    const title = prompt('Term Title:');
    if (!title) return;
    await db.createTerm({ program_id: id, term_number: terms.length + 1, title });
    setRefreshTrigger(v => v + 1);
    showToast?.('Term created', 'success');
  };

  const handleDeleteTerm = async (termId: string) => {
    if (window.confirm('Delete this term and all its lessons?')) {
      await db.deleteTerm(termId);
      setRefreshTrigger(v => v + 1);
      showToast?.('Term removed', 'info');
    }
  };

  const handleAddLesson = async (termId: string) => {
    if (role === Role.VIEWER) return;
    const existing = db.getLessons(termId);
    const newLesson = await db.createLesson({
      term_id: termId,
      lesson_number: existing.length + 1,
      title: 'New Module',
      status: Status.DRAFT,
      content_type: 'video' as any,
      content_language_primary: program.language_primary,
      content_languages_available: [program.language_primary],
      content_urls_by_language: { [program.language_primary]: '' }
    });
    onEditLesson(newLesson.id);
  };

  const handleDeleteLesson = async (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this lesson permanently?')) {
      await db.deleteLesson(lessonId);
      setRefreshTrigger(v => v + 1);
      showToast?.('Lesson removed', 'info');
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-4 bg-white border border-slate-200 rounded-2xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h2 className="text-3xl font-black uppercase">{program.title}</h2>
        </div>
        {role !== Role.VIEWER && (
          <div className="flex space-x-4">
            <button onClick={handleDeleteProgram} className="px-6 py-3 text-red-600 font-bold uppercase text-xs">Delete Program</button>
            <button onClick={handleUpdate} className="bg-black text-amber-400 px-8 py-3 rounded-2xl font-black uppercase text-xs">Save</button>
          </div>
        )}
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden">
        <div className="p-12">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black uppercase">Units & Modules</h3>
            {role !== Role.VIEWER && <button onClick={handleCreateTerm} className="bg-amber-400 px-6 py-2 rounded-xl font-black text-xs">+ ADD TERM</button>}
          </div>
          
          <div className="space-y-6">
            {terms.map(t => (
              <div key={t.id} className="border border-slate-100 rounded-3xl overflow-hidden">
                <div className="bg-slate-50 p-6 flex justify-between items-center border-b">
                  <span className="font-black">TERM {t.term_number}: {t.title}</span>
                  <div className="flex space-x-2">
                    <button onClick={() => handleAddLesson(t.id)} className="p-2 hover:text-amber-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                    </button>
                    <button onClick={() => handleDeleteTerm(t.id)} className="p-2 hover:text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {db.getLessons(t.id).map(l => (
                    <div key={l.id} onClick={() => onEditLesson(l.id)} className="flex justify-between items-center p-4 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl cursor-pointer">
                      <span className="text-sm font-bold">{l.lesson_number}. {l.title}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-[10px] font-black uppercase text-slate-400">{l.status}</span>
                        <button onClick={(e) => handleDeleteLesson(e, l.id)} className="text-slate-300 hover:text-red-500">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDetail;
