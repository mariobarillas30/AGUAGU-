import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfigData from '../firebase-applet-config.json';

const app = initializeApp({
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
});

const db = getFirestore(app);

async function checkCollections() {
  const collNames = [
    'products',
    'extra_products',
    'gift_tables',
    'reservations',
    'config',
    'admins',
    'backup',
    'backups',
    'deleted_products',
    'inventory',
    'catalog'
  ];

  for (const name of collNames) {
    try {
      const snap = await getDocs(collection(db, name));
      console.log(`Colección '${name}': ${snap.size} documentos`);
    } catch (e: any) {
      console.log(`Colección '${name}': Error (${e.message})`);
    }
  }
}

checkCollections().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
