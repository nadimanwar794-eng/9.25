
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, SystemSettings } from '../types';
import { Send, Trash2, Edit2, Shield, User as UserIcon, Lock, Clock, Coins, Crown, MessageCircle, AlertTriangle, Ban } from 'lucide-react';
import { CreditConfirmationModal } from './CreditConfirmationModal';

interface Props {
  currentUser: User;
  onUserUpdate: (user: User) => void;
  isAdminView?: boolean;
  settings?: SystemSettings; // New prop for dynamic cost
}

export const UniversalChat: React.FC<Props> = ({ currentUser, onUserUpdate, isAdminView = false, settings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const CHAT_COST = settings?.chatCost ?? 1;
  const COOLDOWN_HOURS = settings?.chatCooldownHours ?? 6;
  const IS_ENABLED = settings?.isChatEnabled ?? true;
  const IS_FREE_MODE = CHAT_COST === 0;

  // Poll for messages
  useEffect(() => {
    const loadMessages = () => {
      const stored = localStorage.getItem('nst_universal_chat');
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canSendMessage = () => {
      if (currentUser.role === 'ADMIN') return { allowed: true };
      
      // BAN CHECK
      if (currentUser.isChatBanned) return { allowed: false, reason: "You are banned from chat." };

      if (!IS_ENABLED) return { allowed: false, reason: "Chat Disabled by Admin" };

      if (IS_FREE_MODE) return { allowed: true }; // Free mode bypasses credit check

      if (currentUser.isPremium) return { allowed: true };
      
      // Credit Check
      if (currentUser.credits < CHAT_COST) return { allowed: false, reason: `Insufficient Credits (Need ${CHAT_COST})` };
      
      // Time Check
      if (currentUser.lastChatTime) {
          const lastTime = new Date(currentUser.lastChatTime).getTime();
          const now = Date.now();
          const diffHours = (now - lastTime) / (1000 * 60 * 60);
          if (diffHours < COOLDOWN_HOURS) return { allowed: false, reason: `Cooldown: Wait ${(COOLDOWN_HOURS - diffHours).toFixed(1)} hrs` };
      }
      
      return { allowed: true };
  };

  const handleSend = () => {
      if (!inputText.trim()) return;
      setErrorMsg(null);

      // Editing Mode
      if (editingId && currentUser.role === 'ADMIN') {
          finalizeSend();
          return;
      }

      // Check Restrictions
      const check = canSendMessage();
      if (!check.allowed) {
          setErrorMsg(check.reason || "Restriction Active");
          return;
      }

      // Payment Check
      const needsPayment = currentUser.role !== 'ADMIN' && !currentUser.isPremium && !IS_FREE_MODE && CHAT_COST > 0;
      
      if (needsPayment) {
          if (currentUser.isAutoDeductEnabled) {
              processPaymentAndSend();
          } else {
              setShowConfirm(true);
          }
      } else {
          finalizeSend();
      }
  };

  const processPaymentAndSend = (enableAuto: boolean = false) => {
      const updatedUser = { 
          ...currentUser, 
          credits: currentUser.credits - CHAT_COST,
          lastChatTime: new Date().toISOString()
      };
      if (enableAuto) updatedUser.isAutoDeductEnabled = true;
      
      onUserUpdate(updatedUser);
      finalizeSend();
      setShowConfirm(false);
  };

  const finalizeSend = () => {
      if (editingId) {
          const updatedMessages = messages.map(m => m.id === editingId ? { ...m, text: inputText } : m);
          setMessages(updatedMessages);
          localStorage.setItem('nst_universal_chat', JSON.stringify(updatedMessages));
          setEditingId(null);
      } else {
          const newMessage: ChatMessage = {
              id: Date.now().toString(),
              userId: currentUser.id,
              userName: currentUser.name,
              userRole: currentUser.role,
              text: inputText,
              timestamp: new Date().toISOString()
          };
          const newMessages = [...messages, newMessage];
          setMessages(newMessages);
          localStorage.setItem('nst_universal_chat', JSON.stringify(newMessages));
      }
      setInputText('');
  };

  // SOFT DELETE
  const handleDelete = (msgId: string) => {
      if (window.confirm("Move this message to Recycle Bin?")) {
          const updatedMessages = messages.map(m => 
              m.id === msgId ? { ...m, isDeleted: true, deletedAt: new Date().toISOString() } : m
          );
          setMessages(updatedMessages);
          localStorage.setItem('nst_universal_chat', JSON.stringify(updatedMessages));
      }
  };

  const handleEdit = (msg: ChatMessage) => {
      setEditingId(msg.id);
      setInputText(msg.text);
  };

  const statusCheck = canSendMessage();

  return (
    <div className={`flex flex-col h-[80vh] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 ${isAdminView ? '' : 'max-w-4xl mx-auto'}`}>
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><MessageCircle size={24} /></div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">Support & Suggestions</h3>
                    <p className="text-xs text-slate-500">Direct line to Admin & Community</p>
                </div>
            </div>
            {!isAdminView && (
                <div className="flex items-center gap-3 text-xs">
                     {IS_FREE_MODE ? (
                         <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                             FREE
                         </span>
                     ) : currentUser.isPremium ? (
                         <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full font-bold shadow-sm">
                             <Crown size={12} /> VIP Access
                         </span>
                     ) : (
                         <div className="flex flex-col items-end">
                             <span className="flex items-center gap-1 text-slate-500 font-bold">
                                 <Coins size={12} className="text-yellow-500" /> {CHAT_COST} Credit
                             </span>
                             <span className="flex items-center gap-1 text-slate-400">
                                 <Clock size={12} /> {COOLDOWN_HOURS}h Cooldown
                             </span>
                         </div>
                     )}
                </div>
            )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.filter(m => !m.isDeleted).map((msg) => {
                const isMe = msg.userId === currentUser.id;
                const isAdminMsg = msg.userRole === 'ADMIN';

                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-4 shadow-sm relative group ${
                             isMe 
                             ? 'bg-blue-600 text-white rounded-tr-none' 
                             : isAdminMsg 
                                ? 'bg-purple-100 text-purple-900 border border-purple-200 rounded-tl-none' 
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                         }`}>
                             <div className="flex justify-between items-start gap-2 mb-1">
                                 <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>
                                     {isAdminMsg && <Shield size={10} className="text-purple-600" />} 
                                     {msg.userName}
                                 </span>
                                 <span className={`text-[9px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                     {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                 </span>
                             </div>
                             <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                             {/* Admin Controls */}
                             {(currentUser.role === 'ADMIN') && (
                                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/20 backdrop-blur-sm rounded p-1">
                                     <button onClick={() => handleEdit(msg)} className="p-1 hover:text-yellow-300 text-slate-300"><Edit2 size={12} /></button>
                                     <button onClick={() => handleDelete(msg.id)} className="p-1 hover:text-red-300 text-slate-300"><Trash2 size={12} /></button>
                                 </div>
                             )}
                         </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
            {errorMsg && (
                <div className="mb-2 text-center">
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full flex items-center justify-center gap-1 mx-auto w-fit">
                        <Lock size={12} /> {errorMsg}
                    </span>
                </div>
            )}
            
            {currentUser.isChatBanned ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-center font-bold flex flex-col items-center gap-2">
                    <Ban size={24} />
                    You have been banned from using Chat.
                </div>
            ) : (
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={!statusCheck.allowed ? statusCheck.reason : "Type a message..."}
                        disabled={!statusCheck.allowed && !editingId} // Allow typing if editing
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={(!statusCheck.allowed && !editingId) || !inputText.trim()}
                        className={`p-3 rounded-xl transition-all ${
                            (!statusCheck.allowed && !editingId)
                            ? 'bg-slate-200 text-slate-400' 
                            : editingId 
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                        }`}
                    >
                        {editingId ? <Edit2 size={20} /> : <Send size={20} />}
                    </button>
                </div>
            )}
            
            {/* Disclaimer for normal users */}
            {!currentUser.isPremium && currentUser.role !== 'ADMIN' && !currentUser.isChatBanned && !IS_FREE_MODE && (
                <p className="text-[10px] text-center text-slate-400 mt-2">
                    Standard Access: 1 msg every {COOLDOWN_HOURS} hours. Costs {CHAT_COST} Credit. <span className="text-indigo-600 font-bold cursor-pointer">Upgrade to Ultra for Unlimited.</span>
                </p>
            )}
        </div>

        {showConfirm && (
            <CreditConfirmationModal 
                title="Send Message"
                cost={CHAT_COST}
                userCredits={currentUser.credits}
                isAutoEnabledInitial={!!currentUser.isAutoDeductEnabled}
                onCancel={() => setShowConfirm(false)}
                onConfirm={(auto) => processPaymentAndSend(auto)}
            />
        )}
    </div>
  );
};
