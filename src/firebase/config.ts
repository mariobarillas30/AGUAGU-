import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfigData from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey || "AIzaSyC_UOHOcKhv48G0fXSicyFYcXsjaO8fIFM",
  authDomain: firebaseConfigData.authDomain || "aguagu-3baf3.firebaseapp.com",
  projectId: firebaseConfigData.projectId || "aguagu-3baf3",
  storageBucket: firebaseConfigData.storageBucket || "aguagu-3baf3.firebasestorage.app",
  messagingSenderId: firebaseConfigData.messagingSenderId || "222228774878",
  appId: firebaseConfigData.appId || "1:222228774878:web:b83bc1cc5b308b1a3f274f",
  measurementId: firebaseConfigData.measurementId || "G-9VM6LD57X4",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Use default or custom Firestore Database
const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firebase Storage initialization
const storage = getStorage(app);

export { app, db, auth, googleProvider, storage };
