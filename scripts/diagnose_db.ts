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
  const productsSnap = await getDocs(collection(db, 'products'));
  console.log(`TOTAL PRODUCTOS EN FIRESTORE: ${productsSnap.size}`);
  
  productsSnap.docs.forEach((d, i) => {
    const p: any = d.data();
    console.log(`\n--- [${i + 1}] ID: ${d.id} ---`);
    console.log(`Nombre: "${p.name}"`);
    console.log(`Precio: ${p.price}, Cantidad: ${p.quantity}, Categoria: ${p.category}`);
    console.log(`CreatedAt: ${p.createdAt}`);
    console.log(`ImageUrl: ${p.imageUrl}`);
    console.log(`Images: ${JSON.stringify(p.images)}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
