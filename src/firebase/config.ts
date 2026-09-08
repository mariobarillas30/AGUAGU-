import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';
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

// Inicializar Firestore con soporte adaptativo para:
// 1) autoDetectLongPolling: previene bloqueos causados por antivirus, proxies y extensiones en navegadores de escritorio.
// 2) persistentMultipleTabManager: evita bloqueos de IndexedDB cuando hay múltiples pestañas abiertas en escritorio.
// 3) Fallback a memoria si el navegador bloquea IndexedDB o almacenamiento local.
let dbInstance: any;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (err) {
  try {
    dbInstance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: memoryLocalCache(),
    });
  } catch (err2) {
    dbInstance = firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
      : getFirestore(app);
  }
}

const db = dbInstance;
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firebase Storage initialization
const storage = getStorage(app);

export { app, db, auth, googleProvider, storage };
