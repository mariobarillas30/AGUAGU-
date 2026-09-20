import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
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

// Lista de los 14 IDs de prueba identificados unívocamente
const TARGET_IDS_TO_DELETE = [
  '0ybqMB8OpZ72PVWgLu91', // Set de 3 Biberones Dr. Brown's Options+ Anticólicos Cuello Ancho
  'MjIAyLC9HU5XGK79IfiC', // Toallitas Húmedas Lucca Extra Grande x80 Unidades con Tapa
  'MptUy54X94qQGJ2rNsrv', // Conjunto Playero 2 Piezas con Protección UV Camaleón
  'VDoNggrhKRBvB3EpdkZf', // Set Completo de Cuidado y Baño Johnson's Baby con Esponja
  'bpvmrh6h9sgrHEuDgp4Q', // Andadera Didáctica Caminador de Empuje Rosa con Pizarra Mágica
  'dB9Ek0bQ1mfpaXBpl9rV', // Vestido Infantil Manga Larga Beige con Falda a Cuadros y Osito
  'giEZroeV6J4Z0z8y6gcN', // Enterizo de Algodón Kimono con Estampado de Ositos
  'iGp1I1b8Kk5B9Ty6dtta', // Gimnasio de Estimulación Temprana Fisher-Price Selva Tropical
  'lmiXSFHvtPkXEJDDzrkK', // Cuna Colecho Safety 1st Ajustable con Lateral Abatible
  'mGYvqDYNeirNxTcZffuL', // Coche Travel System 3 en 1 con Moisés Reversible Rosa Pastel
  'on6mTLM4Is3pqRtB1JE8', // Andadera de Aprendizaje Musical 2 en 1 Asiento y Teclado Gris
  'pq9egmCOlWPtnceCI3el', // Asiento Ergonómico de Tina Antideslizante Nuby (0-6m)
  'wTT93XGygQluGUrmLMNw', // Enterizo Pelele de Algodón Acanalado Verde Salvia con Pies
  'yZcabVfyV6OE3bMTYrTx', // Cuna Corral Plegable 2 Niveles con Cambiador y Maletín
];

const PRESERVED_SOFTCARE_ID = '7rlL747WF2jIid2FWlt0';

async function main() {
  console.log('====================================================');
  console.log('FASE 1: VALIDACIÓN PREVIA ESTRICTA');
  console.log('====================================================');

  // 1. Validar que el producto Softcare no está en la lista de eliminación
  if (TARGET_IDS_TO_DELETE.includes(PRESERVED_SOFTCARE_ID)) {
    throw new Error('ERROR CRÍTICO: El producto Softcare está en la lista de eliminación. Abortando.');
  }
  console.log(`✓ Softcare ID (${PRESERVED_SOFTCARE_ID}) NO forma parte de la lista de eliminación.`);

  // 2. Obtener todas las referencias en mesas
  const tablesSnap = await getDocs(collection(db, 'gift_tables'));
  const referencedProductIds = new Set<string>();
  let totalTableItemsCount = 0;

  for (const tDoc of tablesSnap.docs) {
    const itemsSnap = await getDocs(collection(db, 'gift_tables', tDoc.id, 'table_items'));
    totalTableItemsCount += itemsSnap.size;
    itemsSnap.docs.forEach((iDoc) => {
      const it: any = iDoc.data();
      if (it.productId) {
        referencedProductIds.add(it.productId);
      }
    });
  }

  console.log(`✓ Total de mesas inspeccionadas: ${tablesSnap.size}`);
  console.log(`✓ Total de items en mesas: ${totalTableItemsCount}`);
  console.log(`✓ IDs referenciados en mesas: ${Array.from(referencedProductIds).join(', ')}`);

  // 3. Verificar que ninguno de los 14 IDs a eliminar esté referenciado en las mesas
  for (const id of TARGET_IDS_TO_DELETE) {
    if (referencedProductIds.has(id)) {
      throw new Error(`ERROR CRÍTICO: El ID ${id} está referenciado en una mesa real. Abortando.`);
    }
  }
  console.log('✓ Ninguno de los 14 IDs a eliminar está referenciado por mesas o reservas.');

  // 4. Verificar existencia de cada uno de los 14 productos en la colección products
  const verifiedProductsToDelete: { id: string; name: string }[] = [];
  for (const id of TARGET_IDS_TO_DELETE) {
    const docRef = doc(db, 'products', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`ERROR: El documento con ID ${id} no existe en Firestore products. Abortando.`);
    }
    const data: any = snap.data();
    verifiedProductsToDelete.push({ id, name: data.name });
    console.log(`  - Confirmado para borrado: [${id}] "${data.name}"`);
  }

  console.log('\n====================================================');
  console.log('FASE 2: EJECUCIÓN DEL BORRADO INDIVIDUAL CONTROLADO');
  console.log('====================================================');

  const deletedIds: string[] = [];
  for (const item of verifiedProductsToDelete) {
    const docRef = doc(db, 'products', item.id);
    await deleteDoc(docRef);
    deletedIds.push(item.id);
    console.log(`✓ Eliminado: [${item.id}] "${item.name}"`);
  }

  console.log('\n====================================================');
  console.log('FASE 3: AUDITORÍA Y COMPROBACIÓN POST-BORRADO');
  console.log('====================================================');

  // 1. Revisar colección products
  const remainingProdsSnap = await getDocs(collection(db, 'products'));
  console.log(`Total productos restantes en 'products': ${remainingProdsSnap.size}`);
  remainingProdsSnap.docs.forEach((d) => {
    const p: any = d.data();
    console.log(`  - Producto conservado: ID [${d.id}] "${p.name}" (Precio: ${p.price}, Categoría: ${p.category})`);
  });

  // 2. Verificar que Softcare está presente
  const softcareDoc = await getDoc(doc(db, 'products', PRESERVED_SOFTCARE_ID));
  if (!softcareDoc.exists()) {
    throw new Error('ALERTA: El producto Softcare no se encontró después de la operación.');
  }
  console.log(`✓ Producto Softcare (${PRESERVED_SOFTCARE_ID}) confirmado INTACTO en 'products'.`);

  // 3. Verificar que las mesas siguen 100% intactas
  const postTablesSnap = await getDocs(collection(db, 'gift_tables'));
  let postTotalItemsCount = 0;
  for (const tDoc of postTablesSnap.docs) {
    const itemsSnap = await getDocs(collection(db, 'gift_tables', tDoc.id, 'table_items'));
    postTotalItemsCount += itemsSnap.size;
  }

  console.log(`✓ Total de mesas después del borrado: ${postTablesSnap.size} (Esperado: ${tablesSnap.size})`);
  console.log(`✓ Total de items en mesas después del borrado: ${postTotalItemsCount} (Esperado: ${totalTableItemsCount})`);

  if (postTablesSnap.size !== tablesSnap.size || postTotalItemsCount !== totalTableItemsCount) {
    throw new Error('ALERTA: Hubo variación en las mesas o sus items.');
  }

  console.log('\nOPERACIÓN COMPLETADA CON ÉXITO Y CON SEGURIDAD TOTAL.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fallo en la ejecución:', err);
  process.exit(1);
});
