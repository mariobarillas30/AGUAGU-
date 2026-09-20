import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfigData from '../firebase-applet-config.json';
import { OFFICIAL_AGU_AGU_PRODUCTS } from '../src/data/aguAguCatalog';

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
  const tablesSnap = await getDocs(collection(db, 'gift_tables'));

  const tableItems: any[] = [];
  for (const tDoc of tablesSnap.docs) {
    const itemsSnap = await getDocs(collection(db, 'gift_tables', tDoc.id, 'table_items'));
    itemsSnap.docs.forEach(iDoc => {
      tableItems.push({
        tableId: tDoc.id,
        tableSlug: tDoc.data().slug,
        tableName: tDoc.data().familyName,
        itemId: iDoc.id,
        ...iDoc.data(),
      });
    });
  }

  console.log('--- REVISIÓN DE REFERENCIAS ENTRE PRODUCTOS Y MESAS ---');
  console.log(`Total productos en colección 'products': ${productsSnap.size}`);
  console.log(`Total items en mesas: ${tableItems.length}`);

  console.log('\n--- PRODUCTOS REFERENCIADOS EN MESAS: ---');
  const referencedProductIds = new Set(tableItems.map(ti => ti.productId));
  const referencedProductNames = new Set(tableItems.map(ti => ti.name));

  tableItems.forEach(ti => {
    console.log(`Mesa: ${ti.tableName} (${ti.tableSlug}) | Item: "${ti.name}" | ProdID: ${ti.productId} | Estado: ${ti.status} | Donante: ${ti.donorName || 'N/A'}`);
  });

  console.log('\n--- EVALUACIÓN DE LOS 15 PRODUCTOS ACTUALES DE LA COLECCIÓN PRODUCTS ---');
  productsSnap.docs.forEach((d, i) => {
    const p: any = d.data();
    const isIdReferenced = referencedProductIds.has(d.id);
    const isNameReferenced = referencedProductNames.has(p.name);
    const isOfficialPreset = OFFICIAL_AGU_AGU_PRODUCTS.some(op => op.name === p.name);

    console.log(`[${i+1}] ID: ${d.id}`);
    console.log(`     Nombre: "${p.name}"`);
    console.log(`     Coincide con preset oficial/IA: ${isOfficialPreset ? 'SÍ' : 'NO'}`);
    console.log(`     Referenciado por ID en mesas: ${isIdReferenced ? 'SÍ' : 'NO'}`);
    console.log(`     Referenciado por Nombre en mesas: ${isNameReferenced ? 'SÍ' : 'NO'}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
