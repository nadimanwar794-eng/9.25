import React, { useState, useEffect } from 'react';
import { LessonContent } from '../types';
import { BookOpen, Calendar, ChevronDown, ChevronUp, Trash2, Search, FileText, CheckCircle2 } from 'lucide-react';
import { LessonView } from './LessonView';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<LessonContent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<LessonContent | null>(null);

  useEffect(() => {
    // Load history from local storage
    const stored = localStorage.getItem('nst_user_history');
    if (stored) {
        try {
            setHistory(JSON.parse(stored).reverse()); // Newest first
        } catch (e) { console.error("History parse error", e); }
    }
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm("Delete this note?")) {
        const updated = history.filter(h => h.id !== id);
        setHistory(updated);
        localStorage.setItem('nst_user_history', JSON.stringify(updated.reverse())); // Re-reverse for storage
        if (selectedLesson?.id === id) setSelectedLesson(null);
    }
  };

  const filteredHistory = history.filter(h => 
    h.title.toLowerCase().includes(search.toLowerCase()) || 
    h.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedLesson) {
      return (
          <div className="animate-in slide-in-from-right duration-300">
              <button 
                onClick={() => setSelectedLesson(null)}
                className="mb-4 text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                  &larr; Back to History
              </button>
              {/* Reuse LessonView but mock props usually passed from API */}
              <LessonView 
                 content={selectedLesson}
                 subject={{id: 'hist', name: selectedLesson.subjectName, icon: 'book', color: 'bg-slate-100'}} 
                 classLevel={'10'} // Display only
                 chapter={{id: 'hist', title: selectedLesson.title}}
                 loading={false}
                 onBack={() => setSelectedLesson(null)}
              />
          </div>
      )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                 <FileText className="text-blue-600" /> Saved Notes (365 Days)
            </h3>
        </div>

        <div className="relative mb-6">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Search your notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>

        {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                <p>No saved notes yet. Start learning to build your library!</p>
            </div>
        ) : (
            <div className="space-y-4">
                {filteredHistory.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => setSelectedLesson(item)}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="p-4 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                        {item.subjectName}
                                    </span>
                                    {item.type === 'NOTES_PREMIUM' && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-yellow-300 to-orange-400 text-white px-2 py-0.5 rounded flex items-center gap-1">
                                            Premium
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {item.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                    <Calendar size={12} />
                                    {new Date(item.dateCreated).toLocaleDateString()}
                                </div>
                            </div>
                            <button 
                                onClick={(e) => handleDelete(e, item.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        
                        {/* Preview Footer */}
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center">
                             <span className="text-xs text-slate-500 font-medium">Click to read full note</span>
                             <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <ChevronDown size={16} className="-rotate-90" />
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};