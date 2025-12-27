
import React, { useState } from 'react';
import { Chapter, ContentType, User } from '../types';
import { Crown, BookOpen, Lock, X, HelpCircle, FileText, Printer, Star, FileJson } from 'lucide-react';

interface Props {
  chapter: Chapter;
  user: User; // Added User to check subscription
  credits: number;
  isAdmin: boolean;
  onSelect: (type: ContentType, count?: number) => void;
  onClose: () => void;
}

export const PremiumModal: React.FC<Props> = ({ chapter, user, credits, isAdmin, onSelect, onClose }) => {
  const [mcqCount, setMcqCount] = useState(20);

  const canAccess = (cost: number, type: string) => {
      if (isAdmin) return true;
      // Subscription Logic
      if (user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
          const level = user.subscriptionLevel || 'BASIC';
          if (level === 'ULTRA') return true; // Ultra accesses everything
          // Basic accesses MCQ and Notes
          if (level === 'BASIC' && ['NOTES_HTML_FREE', 'NOTES_HTML_PREMIUM', 'MCQ_ANALYSIS', 'NOTES_PREMIUM', 'NOTES_SIMPLE'].includes(type)) {
              return true;
          }
      }
      // Credit Fallback
      return credits >= cost;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/50 p-1 rounded-full"><X size={20} /></button>
                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Selected Chapter</div>
                <h3 className="text-xl font-bold leading-tight">{chapter.title}</h3>
            </div>
            
            <div className="p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Study Material</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* OPTION 1: FREE PDF - REMOVED 
                    <button 
                        onClick={() => onSelect('PDF_FREE')}
                        className="p-4 rounded-2xl border-2 border-green-100 bg-green-50/50 hover:bg-green-100 hover:border-green-300 flex flex-col items-center text-center gap-3 transition-all"
                    >
                        <div className="bg-green-600 text-white p-3 rounded-xl shadow-lg shadow-green-200">
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Free Notes</div>
                            <div className="text-[10px] text-slate-500">Standard PDF</div>
                        </div>
                        <div className="text-[9px] font-bold bg-white px-2 py-1 rounded border border-green-200 text-green-700">
                            FREE
                        </div>
                    </button>
                    */}

                    {/* OPTION 2: PREMIUM NOTES - REMOVED
                    <button 
                        onClick={() => canAccess(5, 'PDF_PREMIUM') && onSelect('PDF_PREMIUM')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center gap-3 transition-all ${
                            canAccess(5, 'PDF_PREMIUM') 
                            ? 'border-purple-100 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-300' 
                            : 'border-slate-100 bg-slate-50 opacity-70'
                        }`}
                    >
                        <div className="bg-purple-600 text-white p-3 rounded-xl shadow-lg shadow-purple-200">
                            <Crown size={24} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Premium Notes</div>
                            <div className="text-[10px] text-slate-500">High Quality</div>
                        </div>
                        <div className="text-[9px] font-bold bg-white px-2 py-1 rounded border border-purple-200 text-purple-700">
                            {canAccess(5, 'PDF_PREMIUM') && user.isPremium && user.subscriptionLevel === 'ULTRA' ? 'SUBSCRIBED' : (isAdmin ? 'FREE' : '5 CREDITS')}
                        </div>
                    </button>
                    */}
                </div>


                {/* VIDEO OPTION (NEW) - REMOVED
                <button 
                    onClick={() => canAccess(5, 'VIDEO_LECTURE') && onSelect('VIDEO_LECTURE')}
                    className={`w-full p-4 mb-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                        canAccess(5, 'VIDEO_LECTURE') 
                        ? 'border-red-100 bg-red-50/50 hover:bg-red-100 hover:border-red-300' 
                        : 'border-slate-100 bg-slate-50 opacity-70'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-red-600 text-white p-3 rounded-xl shadow-lg shadow-red-200">
                            <BookOpen size={24} className="hidden" /> 
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-slate-800 text-sm">Video Class</div>
                            <div className="text-[10px] text-slate-500">Watch Lecture</div>
                        </div>
                    </div>
                    <div className="text-[9px] font-bold bg-white px-2 py-1 rounded border border-red-200 text-red-700">
                        {canAccess(5, 'VIDEO_LECTURE') && user.isPremium && user.subscriptionLevel === 'ULTRA' ? 'SUBSCRIBED' : (isAdmin ? 'FREE' : '5 CR')}
                    </div>
                </button>
                */}

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4">
                    <h4 className="font-bold text-blue-900 text-sm mb-3 flex items-center gap-2">
                        <HelpCircle size={16} /> AI & Test Mode
                    </h4>
                    
                    <button 
                        onClick={() => canAccess(2, 'MCQ_ANALYSIS') && onSelect('MCQ_ANALYSIS', 20)}
                        className={`w-full flex items-center justify-between p-3 mb-2 bg-white rounded-xl font-bold text-sm transition-all border border-blue-200 ${
                            canAccess(2, 'MCQ_ANALYSIS') ? 'hover:bg-blue-50 text-blue-800' : 'opacity-50 cursor-not-allowed text-slate-400'
                        }`}
                    >
                        <span>Start MCQ Test</span>
                        <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                            {canAccess(2, 'MCQ_ANALYSIS') && user.isPremium ? 'SUBSCRIBED' : (isAdmin ? 'FREE' : '2 CR')}
                        </span>
                    </button>

                    <button 
                        onClick={() => canAccess(5, 'NOTES_PREMIUM') && onSelect('NOTES_PREMIUM')}
                        className={`w-full flex items-center justify-between p-3 bg-white rounded-xl font-bold text-sm transition-all border border-blue-200 ${
                            canAccess(5, 'NOTES_PREMIUM') ? 'hover:bg-blue-50 text-blue-800' : 'opacity-50 cursor-not-allowed text-slate-400'
                        }`}
                    >
                        <span>Generate AI Notes</span>
                        <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                            {canAccess(5, 'NOTES_PREMIUM') && user.isPremium ? 'SUBSCRIBED' : (isAdmin ? 'FREE' : '5 CR')}
                        </span>
                    </button>
                </div>
            </div>
            
            {!canAccess(2, 'MCQ_ANALYSIS') && !isAdmin && (
                <div className="bg-orange-50 p-3 text-center text-[10px] font-bold text-orange-600 border-t border-orange-100">
                    Low Credits! Study 3 hours or use Spin Wheel to earn.
                </div>
            )}
        </div>
    </div>
  );
};
