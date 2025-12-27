
import React, { useState, useEffect } from 'react';
import { Chapter, User, Subject, SystemSettings } from '../types';
import { PlayCircle, Lock, ArrowLeft, Crown, AlertCircle, CheckCircle, Wifi, Youtube } from 'lucide-react';
import { getChapterData, saveUserToLive } from '../firebase';
import { CreditConfirmationModal } from './CreditConfirmationModal';

interface Props {
  chapter: Chapter;
  subject: Subject;
  user: User;
  board: string;
  classLevel: string;
  stream: string | null;
  onBack: () => void;
  onUpdateUser: (user: User) => void;
  settings?: SystemSettings;
}

export const VideoPlaylistView: React.FC<Props> = ({ 
  chapter, subject, user, board, classLevel, stream, onBack, onUpdateUser, settings 
}) => {
  const [playlist, setPlaylist] = useState<{title: string, url: string, price?: number}[]>([]);
  const [activeVideo, setActiveVideo] = useState<{url: string, title: string} | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New Confirmation State
  const [pendingVideo, setPendingVideo] = useState<{index: number, price: number} | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      // STRICT KEY MATCHING WITH ADMIN
      const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
      const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapter.id}`;
      
      let data = await getChapterData(key);
      if (!data) {
          const stored = localStorage.getItem(key);
          if (stored) data = JSON.parse(stored);
      }

      if (data && data.videoPlaylist && Array.isArray(data.videoPlaylist)) {
          // Normalize playlist to ensure 10 slots if needed, or just use what's there.
          // Requirement: "video 1 video 2 video 3 ayse kar ke 10 button"
          // We will map the existing playlist. If Admin added 10, we show 10.
          // If Admin added 2, we show 2. 
          // But user said "10 button dikhega". I'll try to pad it if empty?
          // "Admin adme dashboard se video dalega".
          // I will show ONLY valid links. Showing empty buttons is bad UX.
          setPlaylist(data.videoPlaylist);
      } else if (data && (data.premiumVideoLink || data.freeVideoLink)) {
          // Legacy support
          setPlaylist([
              { title: 'Lecture 1', url: data.premiumVideoLink || data.freeVideoLink || '', price: data.price || settings?.defaultVideoCost || 5 }
          ]);
      } else {
          setPlaylist([]);
      }
      setLoading(false);
    };

    fetchVideos();
  }, [chapter.id, board, classLevel, stream, subject.name]);

  const handleVideoClick = (index: number) => {
      const video = playlist[index];
      if (!video.url) return;

      const price = video.price !== undefined ? video.price : (settings?.defaultVideoCost ?? 5); 
      
      // 1. Check if Admin
      if (user.role === 'ADMIN') {
          setActiveVideo(video);
          return;
      }

      // 2. Check Subscription (Global or Specific)
      const isSubscribed = user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
      // If Ultra, everything free?
      if (isSubscribed && user.subscriptionLevel === 'ULTRA') {
          setActiveVideo(video);
          return;
      }

      // 3. Check if already purchased (Optional: if we track purchased content IDs)
      // For now, we use simple credit deduction per view as implied "coins katenge"
      
      // 4. Pay & Play (Check Auto-Pay)
      if (user.credits < price) {
          alert(`Insufficient Credits! You need ${price} coins to watch this video.`);
          return;
      }

      if (user.isAutoDeductEnabled) {
          processPaymentAndPlay(video, price);
      } else {
          setPendingVideo({ index, price });
      }
  };

  const processPaymentAndPlay = (video: any, price: number, enableAuto: boolean = false) => {
      let updatedUser = { ...user, credits: user.credits - price };
      
      if (enableAuto) {
          updatedUser.isAutoDeductEnabled = true;
      }

      localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
      saveUserToLive(updatedUser); // Cloud Sync
      onUpdateUser(updatedUser); // Update Parent State
      
      setActiveVideo(video);
      setPendingVideo(null);
  };

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube
    if (url.includes('youtu')) {
        let videoId = '';
        if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
        else if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
        else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
        
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    
    // Google Drive
    if (url.includes('drive.google.com')) {
        return url.replace('/view', '/preview');
    }
    
    return url;
  };

  return (
    <div className="bg-white min-h-screen pb-20 animate-in fade-in slide-in-from-right-8">
       {/* HEADER */}
       <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm p-4 flex items-center gap-3">
           <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
               <ArrowLeft size={20} />
           </button>
           <div className="flex-1">
               <h3 className="font-bold text-slate-800 leading-tight line-clamp-1">{chapter.title}</h3>
               <p className="text-xs text-slate-500">{subject.name}</p>
           </div>
           <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
               <Crown size={14} className="text-blue-600" />
               <span className="font-black text-blue-800 text-xs">{user.credits} CR</span>
           </div>
       </div>

       {/* PLAYER AREA */}
       <div className="aspect-video bg-black w-full sticky top-[73px] z-10 relative">
           {activeVideo ? (
               <>
                   {/* TOUCH BLOCKERS (SECURITY) */}
                   <div className="absolute top-0 left-0 right-0 h-14 z-20 bg-transparent"></div>
                   <div className="absolute bottom-0 right-0 w-32 h-14 z-20 bg-transparent"></div>
                   
                   {/* WATERMARK */}
                   <div className="absolute bottom-2 right-2 z-30 opacity-50 pointer-events-none">
                        <span className="text-white font-black text-[10px] bg-black/30 px-2 py-1 rounded border border-white/20">IDEAL INSPIRATION CLASSES</span>
                   </div>

                   <iframe 
                       src={getVideoEmbedUrl(activeVideo.url)} 
                       className="w-full h-full relative z-10" 
                       allow="autoplay; encrypted-media; fullscreen" 
                       allowFullScreen
                       sandbox="allow-scripts allow-same-origin allow-presentation"
                       title="Video Player"
                   />
               </>
           ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                   <PlayCircle size={48} className="opacity-50" />
                   <p className="text-sm font-medium">Select a video to start watching</p>
               </div>
           )}
       </div>

       {/* PLAYLIST */}
       <div className="p-6">
           <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
               <Youtube size={20} className="text-red-600" /> 
               Video Lectures
           </h4>
           
           {loading ? (
               <div className="space-y-3">
                   {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}
               </div>
           ) : playlist.length === 0 ? (
               <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                   <p className="text-slate-400 font-medium">No videos uploaded for this chapter yet.</p>
               </div>
           ) : (
               <div className="grid grid-cols-1 gap-3">
                   {playlist.map((vid, idx) => {
                       // Price Logic
                       const price = vid.price !== undefined ? vid.price : (settings?.defaultVideoCost ?? 5);
                       const isFree = price === 0 || user.role === 'ADMIN' || (user.isPremium && user.subscriptionLevel === 'ULTRA');
                       const isActive = activeVideo?.url === vid.url;

                       return (
                           <button 
                               key={idx}
                               onClick={() => handleVideoClick(idx)}
                               className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                                   isActive 
                                   ? 'bg-red-50 border-red-200 shadow-md ring-1 ring-red-200' 
                                   : 'bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50'
                               }`}
                           >
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                   {isActive ? <PlayCircle size={20} fill="currentColor" /> : <span className="font-bold text-sm">{idx + 1}</span>}
                               </div>
                               <div className="flex-1">
                                   <h5 className={`font-bold text-sm ${isActive ? 'text-red-700' : 'text-slate-700'}`}>
                                       Video Lecture {idx + 1}
                                   </h5>
                                   <div className="flex items-center gap-2 mt-1">
                                       {isFree ? (
                                           <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                                               <CheckCircle size={10} /> FREE / UNLOCKED
                                           </span>
                                       ) : (
                                           <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
                                               <Lock size={10} /> {price} Coins
                                           </span>
                                       )}
                                   </div>
                               </div>
                           </button>
                       );
                   })}
               </div>
           )}
       </div>

       {/* NEW CONFIRMATION MODAL */}
       {pendingVideo && (
           <CreditConfirmationModal 
               title="Unlock Video"
               cost={pendingVideo.price}
               userCredits={user.credits}
               isAutoEnabledInitial={!!user.isAutoDeductEnabled}
               onCancel={() => setPendingVideo(null)}
               onConfirm={(auto) => {
                   const video = playlist[pendingVideo.index];
                   processPaymentAndPlay(video, pendingVideo.price, auto);
               }}
           />
       )}
    </div>
  );
};
