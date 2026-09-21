import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';

export const AUTHORIZED_ADMIN_EMAILS = [
  'mariobarillas24@gmail.com',
  'admin@aguagu.com',
  'admin@tiendadebebes.com',
];

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserProfilePhoto: (newPhotoUrl: string) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  authError: null,
  signInWithGoogle: async () => false,
  signInWithEmail: async () => false,
  logout: async () => {},
  updateUserProfilePhoto: async () => {},
  clearAuthError: () => {},
});

async function verifyAdminPrivileges(currentUser: User): Promise<boolean> {
  try {
    // 1. Verificar Custom Claims en el token de Firebase
    const tokenResult = await currentUser.getIdTokenResult();
    if (tokenResult.claims.admin === true) {
      return true;
    }

    // 2. Verificar lista explícita de correos autorizados
    const userEmail = currentUser.email?.toLowerCase().trim();
    if (userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail)) {
      return true;
    }

    // 3. Verificar documento en colección 'admins' por UID
    const adminUidDoc = await getDoc(doc(db, 'admins', currentUser.uid));
    if (adminUidDoc.exists() && (adminUidDoc.data()?.role === 'admin' || adminUidDoc.data()?.active === true)) {
      return true;
    }

    // 4. Verificar documento en colección 'admins' por email
    if (userEmail) {
      const adminEmailDoc = await getDoc(doc(db, 'admins', userEmail));
      if (adminEmailDoc.exists() && (adminEmailDoc.data()?.role === 'admin' || adminEmailDoc.data()?.active === true)) {
        return true;
      }
    }
  } catch (error) {
    console.warn('Advertencia al consultar colección admins:', error);
    // Fallback seguro a lista de correos autorizados
    const userEmail = currentUser.email?.toLowerCase().trim();
    if (userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail)) {
      return true;
    }
  }
  return false;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let activePhotoURL = currentUser.photoURL;

        // Intentar recuperar foto personalizada guardada en Firestore si no está en currentUser
        try {
          const profileDoc = await getDoc(doc(db, 'admin_profiles', currentUser.uid));
          if (profileDoc.exists() && profileDoc.data()?.photoURL) {
            activePhotoURL = profileDoc.data()?.photoURL;
          }
        } catch (profileErr) {
          console.warn('[AUTH] Error al consultar perfil de usuario en Firestore:', profileErr);
        }

        setUser({
          ...currentUser,
          photoURL: activePhotoURL,
        } as User);

        const hasAdminRole = await verifyAdminPrivileges(currentUser);
        setIsAdmin(hasAdminRole);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const hasAdminRole = await verifyAdminPrivileges(result.user);
      
      let finalPhotoURL = result.user.photoURL;
      try {
        const profileDoc = await getDoc(doc(db, 'admin_profiles', result.user.uid));
        if (profileDoc.exists() && profileDoc.data()?.photoURL) {
          finalPhotoURL = profileDoc.data()?.photoURL;
        }
      } catch (_) {}

      setUser({
        ...result.user,
        photoURL: finalPhotoURL,
      } as User);
      setIsAdmin(hasAdminRole);
      return hasAdminRole;
    } catch (error: any) {
      console.error('Error Google Sign-In:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const hasAdminRole = await verifyAdminPrivileges(result.user);

      let finalPhotoURL = result.user.photoURL;
      try {
        const profileDoc = await getDoc(doc(db, 'admin_profiles', result.user.uid));
        if (profileDoc.exists() && profileDoc.data()?.photoURL) {
          finalPhotoURL = profileDoc.data()?.photoURL;
        }
      } catch (_) {}

      setUser({
        ...result.user,
        photoURL: finalPhotoURL,
      } as User);
      setIsAdmin(hasAdminRole);
      return hasAdminRole;
    } catch (error: any) {
      console.error('Error Email Sign-In:', error);
      throw error;
    }
  };

  const updateUserProfilePhoto = async (newPhotoUrl: string) => {
    if (!auth.currentUser) {
      throw new Error('No hay una sesión activa de usuario.');
    }

    const currentUid = auth.currentUser.uid;
    const currentEmail = auth.currentUser.email || '';

    // 1. Actualizar perfil en Firebase Authentication
    await updateProfile(auth.currentUser, {
      photoURL: newPhotoUrl || '',
    });

    // 2. Guardar/sincronizar en Firestore bajo /admin_profiles/{uid}
    try {
      await setDoc(
        doc(db, 'admin_profiles', currentUid),
        {
          uid: currentUid,
          email: currentEmail,
          photoURL: newPhotoUrl || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('[AUTH] Error al sincronizar admin_profile en Firestore (no crítico):', firestoreErr);
    }

    // 3. Actualizar inmediatamente el estado en React para reflejar en toda la interfaz
    if (user) {
      setUser({
        ...user,
        photoURL: newPhotoUrl || '',
      } as User);
    } else {
      setUser({
        ...auth.currentUser,
        photoURL: newPhotoUrl || '',
      } as User);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setIsAdmin(false);
    setAuthError(null);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        authError,
        signInWithGoogle,
        signInWithEmail,
        logout,
        updateUserProfilePhoto,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


