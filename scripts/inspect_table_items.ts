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

async function main() {
  const tablesSnap = await getDocs(collection(db, 'gift_tables'));
  for (const tDoc of tablesSnap.docs) {
    const tData: any = tDoc.data();
    console.log(`\n========================================`);
    console.log(`MESA: ${tDoc.id} | Slug: ${tData.slug} | Familia: ${tData.familyName} | Bebé: ${tData.babyName}`);
    console.log(`Fecha: ${tData.eventDate} | Hora: ${tData.eventTime || 'N/A'} | Género: ${tData.babyGender || 'N/A'}`);
    console.log(`Creada: ${tData.createdAt}`);
    console.log(`========================================`);
    
    const itemsSnap = await getDocs(collection(db, 'gift_tables', tDoc.id, 'table_items'));
    itemsSnap.docs.forEach((itemDoc, idx) => {
      const it: any = itemDoc.data();
      console.log(`\n  [Item ${idx + 1}] ID: ${itemDoc.id}`);
      console.log(`  productId: ${it.productId}`);
      console.log(`  nombre: ${it.name}`);
      console.log(`  precio: ${it.price}`);
      console.log(`  status: ${it.status}`);
      console.log(`  donorName: ${it.donorName}`);
      console.log(`  donorPhone: ${it.donorPhone}`);
      console.log(`  paymentMethod: ${it.paymentMethod}`);
      console.log(`  imageUrl: ${it.imageUrl}`);
      console.log(`  images: ${JSON.stringify(it.images)}`);
      console.log(`  description: ${it.description}`);
      console.log(`  updatedAt: ${it.updatedAt}`);
    });
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
