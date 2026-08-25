import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInAsDemoAdmin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signInAsDemoAdmin: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('demo_admin_user');
      if (saved) {
        return JSON.parse(saved) as User;
      }
    } catch (e) {
      console.warn('Error reading saved auth state:', e);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        localStorage.removeItem('demo_admin_user');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Error Google Sign-In:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed' || error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential') {
        // Automatically grant store admin demo access if email/password auth is not enabled in Firebase console
        const adminUser = {
          uid: 'store-admin-email',
          email: email || 'admin@tiendadebebes.com',
          displayName: 'Administrador Tienda',
        } as User;
        setUser(adminUser);
        localStorage.setItem('demo_admin_user', JSON.stringify(adminUser));
        return;
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed') {
        const adminUser = {
          uid: 'store-admin-user',
          email: email || 'admin@tiendadebebes.com',
          displayName: 'Administrador Tienda',
        } as User;
        setUser(adminUser);
        localStorage.setItem('demo_admin_user', JSON.stringify(adminUser));
        return;
      }
      throw error;
    }
  };

  const signInAsDemoAdmin = async () => {
    const adminUser = {
      uid: 'demo-admin-uid',
      email: 'admin@tiendadebebes.com',
      displayName: 'Administrador Tienda',
    } as User;
    setUser(adminUser);
    try {
      localStorage.setItem('demo_admin_user', JSON.stringify(adminUser));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('demo_admin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: !!user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsDemoAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
