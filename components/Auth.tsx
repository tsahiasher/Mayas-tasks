
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import bcrypt from 'bcryptjs';
import * as Lucide from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

const Auth: React.FC<Props> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', 'admin'));
        setIsSetup(userDoc.exists());
        
        // Check session storage for existing session
        const session = sessionStorage.getItem('is_authenticated');
        if (session === 'true') {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      
      await setDoc(doc(db, 'users', 'admin'), {
        username,
        password: hashedPassword
      });
      
      setIsAuthenticated(true);
      setIsSetup(true);
      sessionStorage.setItem('is_authenticated', 'true');
    } catch (err) {
      setError('שגיאה בהגדרת המשתמש');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', 'admin'));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isMatch = bcrypt.compareSync(password, userData.password);
        
        if (username === userData.username && isMatch) {
          setIsAuthenticated(true);
          sessionStorage.setItem('is_authenticated', 'true');
        } else {
          setError('שם משתמש או סיסמה שגויים');
        }
      }
    } catch (err) {
      setError('שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-white/50 dark:border-slate-700/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
            <Lucide.Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            {isSetup ? 'התחברות למערכת' : 'הגדרת משתמש מנהל'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
            {isSetup 
              ? 'אנא הזן את פרטי הגישה שלך' 
              : 'זוהי הפעם הראשונה שלך. אנא בחר שם משתמש וסיסמה מאובטחת.'}
          </p>
        </div>

        <form onSubmit={isSetup ? handleLogin : handleSetup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 mr-1">שם משתמש</label>
            <div className="relative">
              <Lucide.User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
              <Lucide.Key className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
            {isSetup ? 'התחבר' : 'צור משתמש והמשך'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
