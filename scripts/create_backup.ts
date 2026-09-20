import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
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

async function main() {
  const productsSnap = await getDocs(collection(db, 'products'));
  const extrasSnap = await getDocs(collection(db, 'extra_products'));
  const tablesSnap = await getDocs(collection(db, 'gift_tables'));

  const backupData: any = {
    backupCreatedAt: new Date().toISOString(),
    description: 'Respaldo de seguridad previo a cualquier depuración de datos de prueba en Firestore',
    projectId: firebaseConfigData.projectId,
    products: productsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    extra_products: extrasSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    gift_tables_summary: []
  };

  for (const tDoc of tablesSnap.docs) {
    const itemsSnap = await getDocs(collection(db, 'gift_tables', tDoc.id, 'table_items'));
    backupData.gift_tables_summary.push({
      tableId: tDoc.id,
      ...tDoc.data(),
      items: itemsSnap.docs.map(iDoc => ({ id: iDoc.id, ...iDoc.data() }))
    });
  }

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, 'backup_pre_cleanup_2026_09_20.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`Respaldo creado con éxito en: ${backupFilePath}`);
  console.log(`Total productos respaldados: ${backupData.products.length}`);
  console.log(`Total extras respaldados: ${backupData.extra_products.length}`);
  console.log(`Total mesas con items respaldadas: ${backupData.gift_tables_summary.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Error generando respaldo:', err);
  process.exit(1);
});
