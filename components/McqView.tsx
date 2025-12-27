
import React, { useState, useEffect } from 'react';
import { Chapter, User, Subject } from '../types';
import { CheckCircle, Lock, ArrowLeft, Crown, PlayCircle, HelpCircle } from 'lucide-react';
import { getChapterData, saveUserToLive } from '../firebase';
import { LessonView } from './LessonView'; // Reusing existing LessonView for MCQ rendering if possible, or implementing logic here.

// NOTE: Since the existing app uses 'LessonView' to render content including MCQs, 
// we might need to invoke that or replicate the logic.
// The user wants "Free Practice" and "Premium Test".

interface Props {
  chapter: Chapter;
  subject: Subject;
  user: User;
  board: string;
  classLevel: string;
  stream: string | null;
  onBack: () => void;
  onUpdateUser: (user: User) => void;
}

export const McqView: React.FC<Props> = ({ 
  chapter, subject, user, board, classLevel, stream, onBack, onUpdateUser 
}) => {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'SELECTION' | 'PRACTICE' | 'TEST'>('SELECTION');
  const [lessonContent, setLessonContent] = useState<any>(null); // To pass to LessonView
  
  const handleStart = async (mode: 'PRACTICE' | 'TEST') => {
      // 1. Cost Logic
      const cost = mode === 'TEST' ? 2 : 0; // Test Mode (Premium) costs 2 coins usually
      
      // 2. Access Check
      if (user.role !== 'ADMIN' && cost > 0) {
          const isSubscribed = user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
          // Basic can access MCQ
          const hasAccess = isSubscribed; // Assuming Basic includes MCQ
          
          if (!hasAccess && user.credits < cost) {
              alert(`Insufficient Credits! You need ${cost} coins.`);
              return;
          }

          if (!hasAccess) {
              if (!window.confirm(`Start Premium Test for ${cost} Coins?`)) return;
              
              const updatedUser = { ...user, credits: user.credits - cost };
              localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
              saveUserToLive(updatedUser);
              onUpdateUser(updatedUser);
          }
      }

      // 3. Fetch Data & Start
      setLoading(true);
      // STRICT KEY MATCHING WITH ADMIN
      const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
      const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
      
      let data = await getChapterData(key);
      if (!data) {
          const stored = localStorage.getItem(key);
          if (stored) data = JSON.parse(stored);
      }

      if (!data || !data.manualMcqData || data.manualMcqData.length === 0) {
          alert("No MCQs added by Admin for this chapter yet.");
          setLoading(false);
          return;
      }

      // Prepare LessonContent object for the existing LessonView component
      const content = {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: mode === 'TEST' ? 'Premium Test Mode' : 'Free Practice Mode',
          content: '', // Not used for MCQ
          type: mode === 'TEST' ? 'MCQ_ANALYSIS' : 'MCQ_SIMPLE',
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          mcqData: data.manualMcqData
      };
      
      setLessonContent(content);
      setViewMode(mode);
      setLoading(false);
  };

  if (viewMode !== 'SELECTION' && lessonContent) {
      // Render the actual MCQ Interface (reusing LessonView logic or custom)
      // Since LessonView handles MCQ_ANALYSIS and MCQ_SIMPLE, we can wrap it.
      return (
          <LessonView 
              content={lessonContent} 
              subject={subject} 
              classLevel={classLevel as any} 
              chapter={chapter} 
              loading={false} 
              onBack={() => setViewMode('SELECTION')} 
          />
      );
  }

  return (
    <div className="bg-white min-h-screen pb-20 animate-in fade-in slide-in-from-right-8">
       {/* HEADER */}
       <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm p-4 flex items-center gap-3">
           <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
               <ArrowLeft size={20} />
           </button>
           <div className="flex-1">
               <h3 className="font-bold text-slate-800 leading-tight line-clamp-1">{chapter.title}</h3>
               <p className="text-xs text-slate-500">{subject.name} • MCQ Center</p>
           </div>
           <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
               <Crown size={14} className="text-blue-600" />
               <span className="font-black text-blue-800 text-xs">{user.credits} CR</span>
           </div>
       </div>

       <div className="p-6 space-y-4">
           {/* FREE PRACTICE */}
           <button 
               onClick={() => handleStart('PRACTICE')}
               disabled={loading}
               className="w-full p-6 rounded-3xl border-2 border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all group text-left relative overflow-hidden"
           >
               <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <HelpCircle size={80} className="text-blue-600" />
               </div>
               <div className="relative z-10">
                   <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                       <CheckCircle size={24} />
                   </div>
                   <h4 className="text-xl font-black text-slate-800 mb-1">Free Practice</h4>
                   <p className="text-sm text-slate-500 mb-4">Practice questions with instant feedback. No timer.</p>
                   <span className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-blue-200">START NOW</span>
               </div>
           </button>

           {/* PREMIUM TEST - REMOVED AS REQUESTED */}
           
           {loading && <div className="text-center py-4 text-slate-500 font-bold animate-pulse">Loading Questions...</div>}
       </div>
    </div>
  );
};
