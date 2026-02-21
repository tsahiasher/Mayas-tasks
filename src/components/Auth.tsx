
import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  User,
  getIdTokenResult
} from 'firebase/auth';
import { Rocket, User as UserIcon, Key, Lock, AlertTriangle } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/services/firebase';

interface Props {
  children: React.ReactNode;
}

const Auth: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check bootstrap status
    const unsubscribeBootstrap = onSnapshot(doc(db, 'settings', 'auth'), (docSnap) => {
      if (docSnap.exists()) {
        setIsBootstrapped(docSnap.data().bootstrapped === true);
      } else {
        setIsBootstrapped(false);
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const tokenResult = await getIdTokenResult(firebaseUser, true);
          setIsAdmin(tokenResult.claims.admin === true);
          setUser(firebaseUser);
        } catch (err) {
          console.error("Error checking claims:", err);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeBootstrap();
      unsubscribeAuth();
    };
  }, []);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const bootstrapAdmin = httpsCallable(functions, 'bootstrapAdmin');
      await bootstrapAdmin({ username, password });
      
      const email = `${username}@local-admin.invalid`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const tokenResult = await getIdTokenResult(userCredential.user, true);
      if (tokenResult.claims.admin === true) {
        setIsAdmin(true);
      } else {
        setError('החשבון נוצר אך הרשאות המנהל טרם הופעלו. נסה להתחבר שוב.');
      }
    } catch (err) {
      const error = err as { message?: string };
      console.error("Bootstrap error details:", error);
      // Extract the message from Firebase Functions error
      const errorMessage = error.message || 'שגיאה בתהליך ההגדרה הראשונית';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const email = `${username}@local-admin.invalid`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Force token refresh to ensure claims are up to date
      const tokenResult = await getIdTokenResult(userCredential.user, true);
      if (tokenResult.claims.admin === true) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      const error = err as { code?: string };
      console.error("Auth error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('שם משתמש או סיסמה שגויים');
      } else if (error.code === 'auth/too-many-requests') {
        setError('יותר מדי ניסיונות כושלים. נסה שוב מאוחר יותר.');
      } else {
        setError('שגיאה בתהליך האימות');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || isBootstrapped === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not bootstrapped, show setup form
  if (isBootstrapped === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-slate-700/50">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
              <Rocket size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">הגדרת מערכת ראשונית</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
              צור את חשבון המנהל היחיד של המערכת.
            </p>
          </div>

          <form onSubmit={handleBootstrap} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 mr-1">שם משתמש מנהל</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <UserIcon size={18} />
                </span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  placeholder="בחר שם משתמש..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 mr-1">סיסמה</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Key size={18} />
                </span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  placeholder="בחר סיסמה חזקה..."
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              צור מנהל והתחל
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (user && isAdmin) {
    return (
      <>
        {children}
      </>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-slate-700/50 text-center">
          <div className="flex justify-center mb-4 text-amber-500">
            <AlertTriangle size={48} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">גישה חסומה</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-2">מחובר כ: <span className="font-medium">{user.displayName || user.email}</span></p>
          <p className="text-slate-500 dark:text-slate-400 mb-6">אין לך הרשאות מנהל לגישה למערכת זו.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-slate-700/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">התחברות למערכת</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
            אנא הזן את פרטי הגישה שלך
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 mr-1">שם משתמש</label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <UserIcon size={18} />
              </span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                placeholder="הזן שם משתמש..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 mr-1">סיסמה</label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Key size={18} />
              </span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                placeholder="הזן סיסמה..."
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
          >
            התחבר
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
