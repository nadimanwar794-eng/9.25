
import React, { useState, useEffect } from 'react';
import { User, Board, ClassLevel, Stream, SystemSettings, RecoveryRequest } from '../types';
import { ADMIN_EMAIL } from '../constants';
import { saveUserToLive, auth, getUserByEmail } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { UserPlus, LogIn, Lock, User as UserIcon, Phone, Mail, ShieldCheck, ArrowRight, School, GraduationCap, Layers, KeyRound, Copy, Check, AlertTriangle, XCircle, MessageCircle, Send, RefreshCcw, ShieldAlert } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
  logActivity: (action: string, details: string, user?: User) => void;
}

type AuthView = 'LOGIN' | 'SIGNUP' | 'ADMIN' | 'RECOVERY' | 'SUCCESS_ID';

const BLOCKED_DOMAINS = [
    'tempmail.com', 'throwawaymail.com', 'mailinator.com', 'yopmail.com', 
    '10minutemail.com', 'guerrillamail.com', 'sharklasers.com', 'getairmail.com',
    'dispostable.com', 'grr.la', 'mailnesia.com', 'temp-mail.org', 'fake-email.com'
];

export const Auth: React.FC<Props> = ({ onLogin, logActivity }) => {
  const [view, setView] = useState<AuthView>('LOGIN');
  const [generatedId, setGeneratedId] = useState<string>('');
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    name: '',
    mobile: '',
    email: '',
    board: '' as any as Board,
    classLevel: '' as any as ClassLevel,
    stream: '' as any as Stream,
    recoveryCode: ''
  });
  
  // ADMIN VERIFICATION STATE
  const [showAdminVerify, setShowAdminVerify] = useState(false);
  const [adminAuthCode, setAdminAuthCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);

  useEffect(() => {
      const s = localStorage.getItem('nst_system_settings');
      if (s) setSettings(JSON.parse(s));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const generateUserId = () => {
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const namePart = formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      return `IIC-${namePart}-${randomPart}`;
  };

  const handleCopyId = () => {
      navigator.clipboard.writeText(generatedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return false;
      const domain = email.split('@')[1].toLowerCase();
      if (BLOCKED_DOMAINS.includes(domain)) return false;
      return true;
  };

  // --- REQUEST PASSWORD-LESS LOGIN ---
  const handleRequestLogin = () => {
      const inputId = formData.id; // User uses ID field for request
      if (!inputId) {
          setError("Please enter your Login ID or Mobile Number first.");
          return;
      }

      const storedUsersStr = localStorage.getItem('nst_users');
      const users: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];
      const user = users.find(u => u.id === inputId || u.mobile === inputId || u.email === inputId);

      if (!user) {
          setError("User not found with this ID/Mobile.");
          return;
      }

      const requestsStr = localStorage.getItem('nst_recovery_requests');
      const requests: RecoveryRequest[] = requestsStr ? JSON.parse(requestsStr) : [];
      
      if (!requests.some(r => r.id === user.id && r.status === 'PENDING')) {
          const newReq: RecoveryRequest = {
              id: user.id,
              name: user.name,
              mobile: user.mobile,
              timestamp: new Date().toISOString(),
              status: 'PENDING'
          };
          localStorage.setItem('nst_recovery_requests', JSON.stringify([newReq, ...requests]));
      }

      setRequestSent(true);
      setError(null);
  };

  const checkLoginStatus = () => {
      const inputId = formData.id;
      if (!inputId) return;
      
      setStatusCheckLoading(true);
      setTimeout(() => {
          const storedUsersStr = localStorage.getItem('nst_users');
          const users: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];
          const user = users.find(u => u.id === inputId || u.mobile === inputId || u.email === inputId);

          if (user) {
              const requestsStr = localStorage.getItem('nst_recovery_requests');
              const requests: RecoveryRequest[] = requestsStr ? JSON.parse(requestsStr) : [];
              const myRequest = requests.find(r => r.id === user.id);

              if (myRequest && myRequest.status === 'RESOLVED') {
                  const updatedUser = { ...user, isArchived: false, deletedAt: undefined, lastLoginDate: new Date().toISOString() };
                  const updatedReqs = requests.filter(r => r.id !== user.id);
                  localStorage.setItem('nst_recovery_requests', JSON.stringify(updatedReqs));
                  
                  const userIdx = users.findIndex(u => u.id === user.id);
                  users[userIdx] = updatedUser;
                  localStorage.setItem('nst_users', JSON.stringify(users));

                  alert("Access Granted! Logging you in...");
                  logActivity("RECOVERY_LOGIN", "User logged in via Admin Recovery", updatedUser);
                  onLogin(updatedUser);
              } else {
                  setError("Admin has not approved yet. Please wait.");
              }
          }
          setStatusCheckLoading(false);
      }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storedUsersStr = localStorage.getItem('nst_users');
    const users: User[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

    // --- ADMIN LOGIC ---
    if (view === 'ADMIN') {
        const allowedEmail = settings?.adminEmail || ADMIN_EMAIL;

        // Step 1: Verify Email
        if (!showAdminVerify) {
            if (formData.email.trim() !== allowedEmail) {
                setError('Access Denied. Unauthorized Email.');
                return;
            }
            setShowAdminVerify(true); // Move to Code Step
            setError(null);
            return;
        }

        // Step 2: Verify Code
        // Default codes + Dynamic Admin Code from Settings
        let validCodes = ['NSTA', 'TNASSR@0319#1108', 'NSTA21122025'];
        if (settings && settings.adminCode) {
            validCodes.push(settings.adminCode);
        }
        
        if (!validCodes.includes(adminAuthCode.trim())) {
            setError('Invalid Verification Code.');
            return;
        }

        // Code matched, proceed to login
        let adminUser = users.find(u => u.email === allowedEmail || u.id === 'ADMIN');
        if (!adminUser) {
            adminUser = {
                id: 'ADMIN',
                password: '',
                name: 'System Admin',
                mobile: '0000000000',
                email: allowedEmail,
                role: 'ADMIN',
                createdAt: new Date().toISOString(),
                credits: 99999,
                streak: 999,
                lastLoginDate: new Date().toISOString(),
                redeemedCodes: [],
                progress: {}
            };
            localStorage.setItem('nst_users', JSON.stringify([...users, adminUser]));
        }
        logActivity("LOGIN", "Admin Logged In", adminUser);
        onLogin(adminUser);
        return;
    }

    // --- STUDENT LOGIN ---
    if (view === 'LOGIN') {
      const input = formData.id.trim();
      const pass = formData.password.trim();

      try {
          // 1. Determine Email
          let loginEmail = input;
          
          // If input is NOT email (looks like ID or Mobile), try to find email from local cache (which is synced from cloud)
          if (!input.includes('@')) {
              const mappedUser = users.find(u => u.id === input || u.mobile === input);
              if (mappedUser && mappedUser.email) {
                  loginEmail = mappedUser.email;
              } else {
                  // Fallback to legacy local check if not found (for old users or sync delay)
                  const legacyUser = users.find(u => 
                     (u.id === input || u.mobile === input) && 
                     u.password === pass &&
                     u.role !== 'ADMIN'
                  );
                  if (legacyUser) {
                      if (legacyUser.isArchived) { setError('Account Deleted.'); return; }
                      logActivity("LOGIN", "Student Logged In (Legacy)", legacyUser);
                      onLogin(legacyUser);
                      return;
                  }
                  throw new Error("User not found. Please use Email to Login if you just signed up.");
              }
          }

          // 2. Firebase Auth Login
          await setPersistence(auth, browserLocalPersistence);
          const userCredential = await signInWithEmailAndPassword(auth, loginEmail, pass);
          const firebaseUser = userCredential.user;

          // 3. Get User Profile (Cloud First)
          let appUser: any = await getUserByEmail(loginEmail);
          
          if (!appUser) {
              // Fallback to local
              appUser = users.find(u => u.email === loginEmail);
          }

          if (!appUser) {
              // Fallback for fresh devices where 'users' list isn't synced yet
              appUser = {
                  id: 'IIC-' + firebaseUser.uid.substring(0, 5).toUpperCase(),
                  name: firebaseUser.displayName || 'Student',
                  email: loginEmail,
                  password: '', // Don't store
                  mobile: '',
                  role: 'STUDENT',
                  createdAt: new Date().toISOString(),
                  credits: 0,
                  streak: 0,
                  lastLoginDate: new Date().toISOString(),
                  board: 'CBSE',
                  classLevel: '10',
                  progress: {},
                  redeemedCodes: []
              } as User;
              // Save to Cloud so it exists next time
              await saveUserToLive(appUser);
          }

          if (appUser.isArchived) { setError('Account Deleted.'); return; }

          logActivity("LOGIN", "Student Logged In (Firebase)", appUser);
          onLogin(appUser);

      } catch (err: any) {
          console.error("Login Error:", err);
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
              setError("Invalid Email/ID or Password.");
          } else {
              setError(err.message || "Login Failed. Try again.");
          }
      }

    } else if (view === 'SIGNUP') {
      if (!formData.password || !formData.name || !formData.mobile || !formData.email) {
        setError('Please fill in all required fields');
        return;
      }
      if (!formData.board) { setError('Please select a Board'); return; }
      if (!formData.classLevel) { setError('Please select a Class'); return; }
      
      const isSenior = formData.classLevel === '11' || formData.classLevel === '12';
      if (isSenior && !formData.stream) { setError('Please select a Stream'); return; }

      if (settings && settings.allowSignup === false) {
          setError('Registration is currently closed by Admin.');
          return;
      }
      if (!validateEmail(formData.email)) {
          setError('Please enter a valid, real Email Address.');
          return;
      }
      if (formData.mobile.length !== 10 || !/^\d+$/.test(formData.mobile)) {
          setError('Mobile number must be exactly 10 digits.');
          return;
      }
      if (formData.password.length < 8 || formData.password.length > 20) {
          setError('Password must be between 8 and 20 characters.');
          return;
      }

      try {
          // 1. Create in Firebase Auth
          await setPersistence(auth, browserLocalPersistence);
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          const uid = userCredential.user.uid;

          const newId = generateUserId();
          const isSenior = formData.classLevel === '11' || formData.classLevel === '12';
          
          const newUser: User = {
            id: newId,
            // We store password locally/db for legacy support/viewing (optional, but requested often by admins)
            // Ideally we shouldn't, but for this specific "Admin Control" requirement, we keep it.
            password: formData.password, 
            name: formData.name,
            mobile: formData.mobile,
            email: formData.email,
            role: 'STUDENT',
            createdAt: new Date().toISOString(),
            credits: settings?.signupBonus || 2,
            streak: 0,
            lastLoginDate: new Date().toISOString(),
            redeemedCodes: [],
            board: formData.board,
            classLevel: formData.classLevel,
            stream: isSenior ? formData.stream : undefined,
            progress: {},
            // FIRST DAY BONUS: 1 Hour Basic Subscription
            subscriptionTier: 'WEEKLY',
            subscriptionEndDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            isPremium: true
          };

          const updatedUsers = [...users, newUser];
          localStorage.setItem('nst_users', JSON.stringify(updatedUsers));
          
          // Sync to Firestore (WITHOUT PASSWORD)
          const firestoreUser = { ...newUser };
          delete firestoreUser.password; // Remove password before syncing to cloud
          await saveUserToLive(firestoreUser);

          logActivity("SIGNUP", `New Student Registered: ${newUser.classLevel} - ${newUser.board}`, newUser);
          
          setGeneratedId(newId);
          setView('SUCCESS_ID');

      } catch (err: any) {
          console.error("Signup Error:", err);
          if (err.code === 'auth/email-already-in-use') {
              setError("This Email is already registered. Please Login.");
          } else {
              setError("Signup Failed: " + err.message);
          }
      }
    }
  };

  // SUCCESS SCREEN
  if (view === 'SUCCESS_ID') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200 text-center animate-in zoom-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Account Created!</h2>
                <p className="text-slate-500 text-sm mb-6">Here is your unique Login ID. Please save it.</p>
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-6 flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold text-slate-800 tracking-wider">{generatedId}</span>
                    <button onClick={handleCopyId} className="text-slate-400 hover:text-blue-600">
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                </div>
                <button onClick={() => setView('LOGIN')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl">Proceed to Login</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans py-10">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl ring-4 ring-blue-50 animate-bounce-slow p-2">
              <h1 className="text-5xl font-black text-blue-600">{settings?.appShortName || 'IIC'}</h1>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight leading-none text-wrap max-w-xs mx-auto">
              {settings?.appName || 'IDEAL INSPIRATION CLASSES'}
          </h1>
          <p className="text-slate-400 font-bold tracking-[0.2em] text-[10px] uppercase mt-2">The Future of Learning</p>
          
          <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-bold">AI Notes</span>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-bold">MCQ Analysis</span>
              <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-bold">Video Lectures</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
          {view === 'LOGIN' && <LogIn className="text-blue-600" />}
          {view === 'SIGNUP' && <UserPlus className="text-blue-600" />}
          {view === 'RECOVERY' && <KeyRound className="text-orange-500" />}
          
          {view === 'LOGIN' && 'Student Login'}
          {view === 'SIGNUP' && 'Create Account'}
          {view === 'RECOVERY' && 'Request Login'}
          {view === 'ADMIN' && (showAdminVerify ? 'Admin Verification' : 'Admin Login')}
        </h2>

        {settings?.loginMessage && view === 'LOGIN' && !error && (
            <div className="bg-blue-50 text-blue-800 text-sm font-medium p-4 rounded-xl mb-6 border border-blue-100 flex items-start gap-2">
               <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {settings.loginMessage}
            </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl mb-6 border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
            <XCircle size={18} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          
          {view === 'RECOVERY' && (
              <div className="animate-in fade-in">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6 text-center">
                    <p className="text-sm text-orange-800 font-medium mb-1">Login without Password</p>
                    <p className="text-[10px] text-orange-600">Enter your ID or Mobile below and click Request. Admin will approve your login directly.</p>
                </div>

                <div className="space-y-1.5 mb-4">
                    <label className="text-xs font-bold text-slate-500 uppercase">Login ID / Mobile</label>
                    <input name="id" type="text" placeholder="IIC-XXXX or Mobile Number" value={formData.id} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                </div>

                {!requestSent ? (
                    <button type="button" onClick={handleRequestLogin} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                        <Send size={18} /> Request Admin Approval
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
                            <p className="text-sm font-bold text-yellow-800">Request Sent!</p>
                            <p className="text-xs text-yellow-600 mt-1">Waiting for Admin to approve...</p>
                        </div>
                        <button type="button" onClick={checkLoginStatus} disabled={statusCheckLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
                            {statusCheckLoading ? 'Checking...' : <><RefreshCcw size={18} /> Check Status & Login</>}
                        </button>
                    </div>
                )}
                
                <button type="button" onClick={() => { setView('LOGIN'); setRequestSent(false); }} className="w-full text-slate-400 font-bold py-2 mt-2">Back to Password Login</button>
              </div>
          )}

          {view === 'SIGNUP' && (
              <>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                    <input name="name" type="text" placeholder="Real Name (e.g., Rahul Kumar)" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Password (8-20 Chars)</label>
                    <input name="password" type="password" placeholder="Create Password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl" maxLength={20} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Real Email Address</label>
                    <input name="email" type="email" placeholder="your.email@gmail.com" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Mobile (10 Digits)</label>
                    <input name="mobile" type="tel" placeholder="Mobile Number" value={formData.mobile} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl" maxLength={10} />
                </div>
                <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-100">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-blue-800 uppercase">Board</label>
                        <select name="board" value={formData.board} onChange={handleChange} className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-white text-slate-700">
                            <option value="">Select Board</option>
                            <option value="CBSE">CBSE Board</option>
                            <option value="BSEB">Bihar Board (BSEB)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-blue-800 uppercase">Class</label>
                        <select name="classLevel" value={formData.classLevel} onChange={handleChange} className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-white text-slate-700">
                            <option value="">Select Class</option>
                            {['6','7','8','9','10','11','12'].map(c => <option key={c} value={c}>Class {c}</option>)}
                            <option value="COMPETITION">Competitive Exam</option>
                        </select>
                    </div>
                    {(formData.classLevel === '11' || formData.classLevel === '12') && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-blue-800 uppercase">Stream</label>
                            <select name="stream" value={formData.stream} onChange={handleChange} className="w-full px-4 py-3 border border-blue-200 rounded-xl bg-white text-slate-700">
                                <option value="">Select Stream</option>
                                <option value="Science">Science</option>
                                <option value="Commerce">Commerce</option>
                                <option value="Arts">Arts</option>
                            </select>
                        </div>
                    )}
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl mt-4">Generate ID & Sign Up</button>
              </>
          )}

          {view === 'LOGIN' && (
              <>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Login ID / Mobile / Email</label>
                    <input name="id" type="text" placeholder="Enter ID, Mobile or Email" value={formData.id} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                    <input name="password" type="password" placeholder="Enter Password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                 </div>
                 <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl mt-4">Login</button>
              </>
          )}
          
          {view === 'ADMIN' && (
              <>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Admin Email</label>
                    <input 
                        name="email" 
                        type="email" 
                        placeholder="Authorized Email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        disabled={showAdminVerify}
                        className={`w-full px-4 py-3 border rounded-xl ${showAdminVerify ? 'bg-slate-100 border-slate-200 text-slate-500' : 'border-slate-200'}`} 
                    />
                </div>
                
                {/* VERIFICATION CODE INPUT */}
                {showAdminVerify && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1">
                            <ShieldAlert size={12} /> Verification Code
                        </label>
                        <input 
                            name="adminAuthCode" 
                            type="password" 
                            placeholder="Enter Secret Code" 
                            value={adminAuthCode} 
                            onChange={(e) => setAdminAuthCode(e.target.value)} 
                            className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" 
                            autoFocus
                        />
                    </div>
                )}

                <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl mt-4 flex items-center justify-center gap-2">
                    {showAdminVerify ? <><Lock size={18} /> Access Dashboard</> : 'Verify Email'}
                </button>
              </>
          )}

        </form>

        {view === 'LOGIN' && (
            <div className="mt-6 text-center">
                <button onClick={() => setView('RECOVERY')} className="text-xs text-orange-500 font-bold hover:underline bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
                    Request Login without Password
                </button>
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-slate-500 text-sm">New Student? <button onClick={() => setView('SIGNUP')} className="text-blue-600 font-bold">Register Here</button></p>
                </div>
                <button onClick={() => { setView('ADMIN'); setShowAdminVerify(false); setAdminAuthCode(''); setError(null); }} className="mt-4 text-[10px] text-slate-300 font-bold uppercase tracking-widest">Admin Access</button>
            </div>
        )}
        {view !== 'LOGIN' && (
            <div className="mt-4 text-center">
                <button onClick={() => setView('LOGIN')} className="text-slate-500 font-bold text-sm">Back to Login</button>
            </div>
        )}
      </div>
    </div>
  );
};
