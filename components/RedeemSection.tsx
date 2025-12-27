import React, { useState } from 'react';
import { Gift, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { User, GiftCode } from '../types';
import { ref, get, update } from "firebase/database";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { rtdb, db, saveUserToLive } from "../firebase";

interface Props {
  user: User;
  onSuccess: (updatedUser: User) => void;
}

export const RedeemSection: React.FC<Props> = ({ user, onSuccess }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [msg, setMsg] = useState('');

  const handleRedeem = async () => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setStatus('LOADING');
    
    try {
        let targetCode: any = null;
        let source = 'NONE';

        // 1. Check RTDB
        const codeRef = ref(rtdb, `redeem_codes/${cleanCode}`);
        const snapshot = await get(codeRef);
        
        if (snapshot.exists()) {
            targetCode = snapshot.val();
            source = 'RTDB';
        } else {
            // 2. Check Firestore
            try {
                const docRef = doc(db, "redeem_codes", cleanCode);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    targetCode = docSnap.data();
                    source = 'FIRESTORE';
                }
            } catch(e) { console.error("Firestore Code Check Error", e); }
        }

        if (!targetCode) {
            setStatus('ERROR');
            setMsg('Invalid Code. Please check and try again.');
            return;
        }
        
        if (targetCode.isRedeemed) {
            setStatus('ERROR');
            setMsg('This code has already been redeemed.');
            return;
        }

        // Success Logic - Mark as Used
        if (source === 'RTDB') {
            await update(codeRef, { isRedeemed: true, redeemedBy: user.id });
            // Attempt parallel update to Firestore if exists, for consistency
            try { await updateDoc(doc(db, "redeem_codes", cleanCode), { isRedeemed: true, redeemedBy: user.id }); } catch(e){}
        } else {
            await updateDoc(doc(db, "redeem_codes", cleanCode), { isRedeemed: true, redeemedBy: user.id });
            // Attempt parallel update to RTDB
            try { await update(codeRef, { isRedeemed: true, redeemedBy: user.id }); } catch(e){}
        }

        // 3. Update User Credits
        const newCredits = (user.credits || 0) + targetCode.amount;
        const updatedUser = { 
            ...user, 
            credits: newCredits, 
            redeemedCodes: [...(user.redeemedCodes || []), targetCode.code] 
        };
        
        // Save User immediately to global storage & Cloud
        const allUsersStr = localStorage.getItem('nst_users');
        if (allUsersStr) {
            const allUsers: User[] = JSON.parse(allUsersStr);
            const userIdx = allUsers.findIndex(u => u.id === user.id);
            if (userIdx !== -1) {
                allUsers[userIdx] = updatedUser;
                localStorage.setItem('nst_users', JSON.stringify(allUsers));
            }
        }
        localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
        await saveUserToLive(updatedUser); // छात्र को क्रेडिट दें

        setStatus('SUCCESS');
        setMsg(`Success! Added ${targetCode.amount} Premium Notes.`);
        setCode('');
        onSuccess(updatedUser);
        
        setTimeout(() => {
            setStatus('IDLE');
            setMsg('');
        }, 3000);

    } catch (e) {
        setStatus('ERROR');
        setMsg('Connection Error. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-6">
        <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                <Gift size={24} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800">Redeem Gift Code</h3>
                <p className="text-xs text-slate-500">Have a code from Admin? Enter it here.</p>
            </div>
        </div>
        
        <div className="relative">
            <input 
                type="text" 
                placeholder="Ex: NST-10-X9Z2..." 
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full pl-4 pr-12 py-3 border-2 border-slate-100 rounded-xl font-mono text-slate-700 focus:outline-none focus:border-purple-500 transition-colors uppercase placeholder:normal-case"
            />
            <button 
                onClick={handleRedeem}
                disabled={status === 'LOADING' || !code}
                className="absolute right-2 top-2 bottom-2 bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
                <ArrowRight size={20} />
            </button>
        </div>

        {status === 'ERROR' && (
            <div className="mt-3 flex items-center gap-2 text-red-500 text-sm font-medium animate-in slide-in-from-top-1">
                <AlertCircle size={16} /> {msg}
            </div>
        )}
        
        {status === 'SUCCESS' && (
            <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium animate-in slide-in-from-top-1">
                <CheckCircle size={16} /> {msg}
            </div>
        )}
    </div>
  );
};