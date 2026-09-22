import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  writeBatch,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Product, GiftTable, TableItem, ExtraProduct, StoreConfig, ItemStatus, ReserveItemResult, DeletedGiftTable } from '../types';
import {
  OFFICIAL_AGU_AGU_PRODUCTS,
  OFFICIAL_AGU_AGU_EXTRAS,
} from '../data/aguAguCatalog';
import {
  deleteProductImagesFolder,
  deleteImageFromStorageByUrl,
} from './storageService';
import { withTimeout } from '../utils/asyncUtils';
import { normalizeTableSlug, generateRandomSlug, getCanonicalMesaUrl } from '../utils/slug';

export { normalizeTableSlug, generateRandomSlug, getCanonicalMesaUrl };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Colecciones principales
const PRODUCTS_COLLECTION = 'products';
const GIFT_TABLES_COLLECTION = 'gift_tables';
const TABLE_ITEMS_SUBCOLLECTION = 'table_items';
const DELETED_GIFT_TABLES_COLLECTION = 'deleted_gift_tables';
const EXTRA_PRODUCTS_COLLECTION = 'extra_products';
const CONFIG_COLLECTION = 'config';
const STORE_CONFIG_DOC = 'store_settings';

// Default config (El Salvador: +503 6868 7046)
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  whatsappNumber: '50368687046',
  storeName: 'Agu Agu - Artículos de Bebé',
  storeAddress: 'Tienda Oficial Agu Agu',
  currencySymbol: '$',
  logoUrl: '',
};

// -----------------------------------------------------------------------------
// CONFIGURACIÓN DE LA TIENDA
// -----------------------------------------------------------------------------
export async function getStoreConfig(): Promise<StoreConfig> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, STORE_CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as StoreConfig;
      if (!data.whatsappNumber || data.whatsappNumber === '50212345678' || data.whatsappNumber === '50370000000' || data.whatsappNumber === '50363031927') {
        const updated = { ...data, whatsappNumber: '50368687046' };
        await setDoc(docRef, updated, { merge: true });
        return updated;
      }
      return { ...DEFAULT_STORE_CONFIG, ...data };
    } else {
      // Guardar valor por defecto si no existe
      await setDoc(docRef, DEFAULT_STORE_CONFIG);
      return DEFAULT_STORE_CONFIG;
    }
  } catch (error) {
    console.warn('Error al obtener configuración de tienda, usando default:', error);
    return DEFAULT_STORE_CONFIG;
  }
}

export async function updateStoreConfig(newConfig: Partial<StoreConfig>): Promise<void> {
  const docRef = doc(db, CONFIG_COLLECTION, STORE_CONFIG_DOC);
  await setDoc(docRef, newConfig, { merge: true });
}

// -----------------------------------------------------------------------------
// INVENTARIO GENERAL (products)
// -----------------------------------------------------------------------------
export async function getProducts(): Promise<Product[]> {
  try {
    const coll = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(coll);
    const items: Product[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as Product);
    });

    return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (error: any) {
    console.error('Error al obtener productos de Firestore:', error);
    // Si hay error de conexión o permisos, devolver catálogo base local de respaldo
    return OFFICIAL_AGU_AGU_PRODUCTS.map((p, idx) => ({ id: `local-prod-${idx}`, ...p }));
  }
}

export async function addProduct(product: Omit<Product, 'id'>): Promise<string> {
  const coll = collection(db, PRODUCTS_COLLECTION);
  const addPromise = addDoc(coll, {
    ...product,
    createdAt: new Date().toISOString(),
  });
  const timeoutPromise = new Promise<any>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_ADD_DOC')), 4500)
  );

  try {
    const docRef = await Promise.race([addPromise, timeoutPromise]);
    return docRef.id;
  } catch (err) {
    console.warn('Aviso: addDoc tardó más de 4.5s o se resolvió en caché local:', err);
    return `prod-${Date.now()}`;
  }
}

/**
 * Agrega un lote de productos al inventario general usando writeBatch de Firestore
 * con soporte para lotes fragmentados (máx 100 docs por batch) y fallback individual.
 */
export async function addProductsBatch(
  newProducts: Omit<Product, 'id'>[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ addedCount: number; ids: string[] }> {
  if (!newProducts || newProducts.length === 0) {
    return { addedCount: 0, ids: [] };
  }

  const coll = collection(db, PRODUCTS_COLLECTION);
  const ids: string[] = [];
  const chunkSize = 100;

  for (let i = 0; i < newProducts.length; i += chunkSize) {
    const chunk = newProducts.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const chunkIds: string[] = [];

    for (const item of chunk) {
      const newDocRef = doc(coll);
      chunkIds.push(newDocRef.id);
      batch.set(newDocRef, {
        ...item,
        createdAt: new Date().toISOString(),
      });
    }

    try {
      await withTimeout(batch.commit(), 9000, 'TIMEOUT_BATCH_COMMIT');
      ids.push(...chunkIds);
    } catch (err) {
      console.warn('Batch commit falló o superó el tiempo límite, insertando de forma individual:', err);
      for (const item of chunk) {
        try {
          const singleId = await addProduct(item);
          ids.push(singleId);
        } catch (singleErr) {
          console.error('Error insertando producto individual en fallback:', singleErr);
        }
      }
    }

    onProgress?.(Math.min(i + chunkSize, newProducts.length), newProducts.length);
  }

  return { addedCount: ids.length, ids };
}

/**
 * Normaliza cadenas para comparación flexible (sin acentos, minúsculas, sin puntuación)
 */
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Determina si dos productos corresponden al mismo artículo para sincronización cruzada
 */
export function areProductsMatching(
  prodName: string,
  extraName: string,
  prodDesc?: string,
  extraDesc?: string
): boolean {
  const pNorm = normalizeText(prodName);
  const eNorm = normalizeText(extraName);

  if (!pNorm || !eNorm) return false;
  if (pNorm === eNorm) return true;
  if (pNorm.includes(eNorm) || eNorm.includes(pNorm)) return true;

  // Palabras clave específicas de cuidado infantil
  if (pNorm.includes('toallita') && eNorm.includes('toallita')) return true;
  if (pNorm.includes('panal') && eNorm.includes('panal')) return true;
  if (
    (pNorm.includes('bano') || pNorm.includes('cuidado') || pNorm.includes('johnson')) &&
    (eNorm.includes('bano') || eNorm.includes('cuidado') || eNorm.includes('johnson'))
  ) {
    return true;
  }
  if (pNorm.includes('envoltura') && eNorm.includes('envoltura')) return true;

  // Coincidencia por conjunto de palabras significativas (>3 caracteres)
  const pWords = pNorm.split(/\s+/).filter((w) => w.length > 3);
  const eWords = eNorm.split(/\s+/).filter((w) => w.length > 3);
  const common = pWords.filter((w) => eWords.includes(w));
  if (
    common.length >= 2 ||
    (pWords.length > 0 && common.length / Math.min(pWords.length, eWords.length) >= 0.5)
  ) {
    return true;
  }

  return false;
}

/**
 * Desactivado permanentemente según requerimiento de la tienda.
 * El inventario se gestiona de forma manual y no se realizan sincronizaciones automáticas.
 */
export async function syncAllTablesWithInventory(): Promise<void> {
  return Promise.resolve();
}

/**
 * Desactivado permanentemente según requerimiento de la tienda.
 * El inventario se gestiona de forma manual y no se realizan sincronizaciones automáticas.
 */
export async function syncAllExtrasWithInventory(): Promise<void> {
  return Promise.resolve();
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  // Actualizar inmediatamente en Firestore con timeout de seguridad
  await Promise.race([
    updateDoc(docRef, product),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_UPDATE_DOC')), 4000)),
  ]).catch((err) => console.warn('Aviso en updateDoc Firestore:', err));
}

/**
 * Elimina un producto de Firestore y limpia sus fotografías en Firebase Storage.
 *
 * Flujo riguroso y garantizado:
 * 1. Identificación previa de fotografías (imageUrl, images) para eliminación segura.
 * 2. await deleteDoc(docRef): Firestore es la condición crítica y determinante de eliminación.
 *    Si Firestore rechaza la operación (permisos, desconexión, etc.), se propaga el error
 *    específico y la UI jamás asume falsamente que el producto fue eliminado.
 * 3. Limpieza de imágenes en Firebase Storage: Solo se ejecuta DESPUÉS de que Firestore
 *    confirmó la eliminación. Errores secundarios de Storage (object-not-found, permisos, timeout)
 *    se capturan de forma controlada y JAMÁS provocan un estado de carga infinito ni fallan la operación.
 */
export async function deleteProduct(
  id: string,
  cachedProduct?: Partial<Product> | null
): Promise<void> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID de producto inválido para la eliminación.');
  }

  const docRef = doc(db, PRODUCTS_COLLECTION, id);

  // 1. Identificación de fotografías asociadas
  const imageUrlsToDelete: string[] = [];
  if (cachedProduct?.imageUrl) {
    imageUrlsToDelete.push(cachedProduct.imageUrl);
  }
  if (Array.isArray(cachedProduct?.images)) {
    imageUrlsToDelete.push(...cachedProduct.images);
  }

  // Si no se pasaron fotos en caché, intentar obtenerlas de Firestore antes de borrar
  if (imageUrlsToDelete.length === 0) {
    try {
      const snap = await withTimeout(getDoc(docRef), 2000, 'TIMEOUT_GET_DOC');
      if (snap.exists()) {
        const data = snap.data() as Product;
        if (data.imageUrl) imageUrlsToDelete.push(data.imageUrl);
        if (Array.isArray(data.images)) imageUrlsToDelete.push(...data.images);
      }
    } catch {
      // Si getDoc falla o se agota el timeout, continuar hacia deleteDoc
    }
  }

  // 2. ELIMINACIÓN REAL Y CONFIRMADA EN FIRESTORE (await deleteDoc)
  try {
    await withTimeout(deleteDoc(docRef), 8000, 'TIMEOUT_DELETE_DOC');
  } catch (firestoreErr: any) {
    console.error('[DELETE PRODUCT] Error al eliminar documento en Firestore:', firestoreErr);
    if (firestoreErr?.code === 'permission-denied') {
      throw new Error('Permisos insuficientes en Firestore. Tu cuenta no está autorizada para eliminar este producto.');
    }
    if (firestoreErr?.code === 'unavailable' || firestoreErr?.message === 'TIMEOUT_DELETE_DOC') {
      throw new Error('Error de conexión con la base de datos Firestore. Revisa tu conexión a internet.');
    }
    throw new Error(firestoreErr?.message || 'Error al eliminar el producto en Firestore.');
  }

  // 3. LIMPIEZA DE FOTOGRAFÍAS EN STORAGE
  // Se ejecuta tras la confirmación de Firestore; un fallo secundario de Storage no debe bloquear la UI
  try {
    await deleteProductImagesFolder(id, false, imageUrlsToDelete);
  } catch (storageErr) {
    console.warn('[DELETE PRODUCT] Aviso secundario al limpiar imágenes en Storage:', storageErr);
  }
}

// -----------------------------------------------------------------------------
// PRODUCTOS EXTRA / DETALLES ESPECIALES (extra_products)
// -----------------------------------------------------------------------------
export async function getExtraProducts(): Promise<ExtraProduct[]> {
  try {
    const coll = collection(db, EXTRA_PRODUCTS_COLLECTION);
    const snap = await getDocs(coll);
    const items: ExtraProduct[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as ExtraProduct);
    });
    return items;
  } catch (error) {
    console.error('Error al obtener productos extra:', error);
    return [];
  }
}

export async function addExtraProduct(extra: Omit<ExtraProduct, 'id'>): Promise<string> {
  const coll = collection(db, EXTRA_PRODUCTS_COLLECTION);
  const addPromise = addDoc(coll, {
    ...extra,
    createdAt: new Date().toISOString(),
  });
  const timeoutPromise = new Promise<any>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_ADD_EXTRA')), 4500)
  );

  try {
    const docRef = await Promise.race([addPromise, timeoutPromise]);
    return docRef.id;
  } catch (err) {
    console.warn('Aviso: addExtraProduct tardó más de 4.5s o se resolvió en caché local:', err);
    return `extra-${Date.now()}`;
  }
}

export async function updateExtraProduct(id: string, extra: Partial<ExtraProduct>): Promise<void> {
  const docRef = doc(db, EXTRA_PRODUCTS_COLLECTION, id);
  await Promise.race([
    updateDoc(docRef, extra),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_UPDATE_EXTRA')), 4000)),
  ]).catch((e) => console.warn('Aviso updateExtraProduct:', e));
}

export async function deleteExtraProduct(
  id: string,
  cachedExtra?: Partial<ExtraProduct> | null
): Promise<void> {
  if (!id || typeof id !== 'string') {
    throw new Error('ID de producto extra inválido para la eliminación.');
  }

  const docRef = doc(db, EXTRA_PRODUCTS_COLLECTION, id);

  const imageUrlsToDelete: string[] = [];
  if (cachedExtra?.imageUrl) {
    imageUrlsToDelete.push(cachedExtra.imageUrl);
  }
  if (Array.isArray(cachedExtra?.images)) {
    imageUrlsToDelete.push(...cachedExtra.images);
  }

  if (imageUrlsToDelete.length === 0) {
    try {
      const snap = await withTimeout(getDoc(docRef), 2000, 'TIMEOUT_GET_EXTRA_DOC');
      if (snap.exists()) {
        const data = snap.data() as ExtraProduct;
        if (data.imageUrl) imageUrlsToDelete.push(data.imageUrl);
        if (Array.isArray(data.images)) imageUrlsToDelete.push(...data.images);
      }
    } catch {
      // Continuar hacia deleteDoc
    }
  }

  try {
    await withTimeout(deleteDoc(docRef), 8000, 'TIMEOUT_DELETE_EXTRA_DOC');
  } catch (firestoreErr: any) {
    console.error('[DELETE EXTRA] Error al eliminar documento en Firestore:', firestoreErr);
    if (firestoreErr?.code === 'permission-denied') {
      throw new Error('Permisos insuficientes en Firestore para eliminar este producto extra.');
    }
    if (firestoreErr?.code === 'unavailable' || firestoreErr?.message === 'TIMEOUT_DELETE_EXTRA_DOC') {
      throw new Error('Error de conexión con la base de datos Firestore.');
    }
    throw new Error(firestoreErr?.message || 'Error al eliminar el producto extra en Firestore.');
  }

  try {
    await deleteProductImagesFolder(id, true, imageUrlsToDelete);
  } catch (storageErr) {
    console.warn('[DELETE EXTRA] Aviso secundario al limpiar imágenes en Storage:', storageErr);
  }
}

// -----------------------------------------------------------------------------
// MESAS DE REGALO (gift_tables)
// -----------------------------------------------------------------------------
export async function getGiftTables(): Promise<GiftTable[]> {
  try {
    const coll = collection(db, GIFT_TABLES_COLLECTION);
    const snap = await getDocs(coll);
    const tables: GiftTable[] = [];
    
    for (const d of snap.docs) {
      const data = d.data();
      if (data.status === 'deleted' || data.isDeleted === true) {
        continue;
      }
      const tableData = { id: d.id, ...data } as GiftTable;
      
      // Obtener conteo de items
      const itemsColl = collection(db, GIFT_TABLES_COLLECTION, d.id, TABLE_ITEMS_SUBCOLLECTION);
      const itemsSnap = await getDocs(itemsColl);
      tableData.itemCount = itemsSnap.size;
      tableData.completedCount = itemsSnap.docs.filter((itemDoc) => {
        const status = itemDoc.data().status;
        return status === 'reservado_en_tienda' || status === 'seleccionado' || status === 'pagado';
      }).length;

      tables.push(tableData);
    }
    
    return tables.sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()));
  } catch (error) {
    console.error('Error al obtener mesas de regalo:', error);
    return [];
  }
}

export async function getGiftTableBySlug(slug: string): Promise<{ table: GiftTable; items: TableItem[] } | null> {
  try {
    const normalizedSlug = normalizeTableSlug(slug);
    if (!normalizedSlug) return null;

    const coll = collection(db, GIFT_TABLES_COLLECTION);
    const q = query(coll, where('slug', '==', normalizedSlug));
    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const tableDoc = snap.docs[0];
    const data = tableDoc.data();
    if (data.status === 'deleted' || data.isDeleted === true) {
      return null;
    }
    const table = { id: tableDoc.id, ...data } as GiftTable;

    // Obtener los productos de la mesa
    const itemsColl = collection(db, GIFT_TABLES_COLLECTION, tableDoc.id, TABLE_ITEMS_SUBCOLLECTION);
    const itemsSnap = await getDocs(itemsColl);
    const items: TableItem[] = [];

    // Obtener inventario para asegurar datos frescos
    const productsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const prods = productsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Product) }));

    itemsSnap.forEach((d) => {
      const itemData = d.data() as TableItem;
      const matchedProd = prods.find(
        (p) =>
          itemData.productId === p.id ||
          areProductsMatching(p.name, itemData.name, p.description, itemData.description)
      );

      // Usar datos sincronizados en tiempo real
      items.push({
        id: d.id,
        tableId: tableDoc.id,
        ...itemData,
        imageUrl: matchedProd?.imageUrl || itemData.imageUrl,
        images: matchedProd?.images && matchedProd.images.length > 0 ? matchedProd.images : itemData.images,
        price: matchedProd?.price !== undefined ? matchedProd.price : itemData.price,
      } as TableItem);
    });

    table.itemCount = items.length;
    table.completedCount = items.filter(
      (i) => i.status === 'reservado_en_tienda' || i.status === 'seleccionado' || i.status === 'pagado'
    ).length;

    return { table, items };
  } catch (error) {
    console.error('Error al buscar mesa por slug:', error);
    return null;
  }
}

export async function getGiftTableById(id: string): Promise<{ table: GiftTable; items: TableItem[] } | null> {
  try {
    const docRef = doc(db, GIFT_TABLES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.status === 'deleted' || data.isDeleted === true) {
      return null;
    }
    const table = { id: snap.id, ...data } as GiftTable;
    const itemsColl = collection(db, GIFT_TABLES_COLLECTION, id, TABLE_ITEMS_SUBCOLLECTION);
    const itemsSnap = await getDocs(itemsColl);
    const items: TableItem[] = [];

    const productsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const prods = productsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Product) }));

    itemsSnap.forEach((d) => {
      const itemData = d.data() as TableItem;
      const matchedProd = prods.find(
        (p) =>
          itemData.productId === p.id ||
          areProductsMatching(p.name, itemData.name, p.description, itemData.description)
      );

      items.push({
        id: d.id,
        tableId: id,
        ...itemData,
        imageUrl: matchedProd?.imageUrl || itemData.imageUrl,
        images: matchedProd?.images && matchedProd.images.length > 0 ? matchedProd.images : itemData.images,
        price: matchedProd?.price !== undefined ? matchedProd.price : itemData.price,
      } as TableItem);
    });

    table.itemCount = items.length;
    table.completedCount = items.filter(
      (i) => i.status === 'reservado_en_tienda' || i.status === 'seleccionado' || i.status === 'pagado'
    ).length;

    return { table, items };
  } catch (error) {
    console.error('Error al obtener mesa por ID:', error);
    return null;
  }
}

export async function getTableItems(tableId: string): Promise<TableItem[]> {
  try {
    const itemsColl = collection(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION);
    const itemsSnap = await getDocs(itemsColl);
    const items: TableItem[] = [];
    itemsSnap.forEach((d) => {
      items.push({ id: d.id, tableId, ...d.data() } as TableItem);
    });
    return items;
  } catch (error) {
    console.error('Error al obtener items de la mesa:', error);
    return [];
  }
}

export async function createGiftTable(
  tableData: Omit<GiftTable, 'id' | 'createdAt' | 'slug'> & { customSlug?: string },
  selectedProducts: Product[] = []
): Promise<{ tableId: string; slug: string }> {
  // Generar o usar slug base con normalización uniforme
  let slug = tableData.customSlug
    ? normalizeTableSlug(tableData.customSlug)
    : generateRandomSlug(tableData.babyName || tableData.familyName || 'mesa');

  if (!slug) {
    slug = generateRandomSlug('mesa');
  }

  // Verificar si ya existe una mesa con este slug para evitar colisiones
  try {
    const checkColl = collection(db, GIFT_TABLES_COLLECTION);
    const q = query(checkColl, where('slug', '==', slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      // Agregar sufijo único si ya existía
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }
  } catch (err) {
    console.warn('Advertencia al verificar slug único:', err);
  }

  // Crear documento de mesa en Firestore
  const tableColl = collection(db, GIFT_TABLES_COLLECTION);
  const newTableDoc = await addDoc(tableColl, {
    familyName: tableData.familyName || 'Familia Invitada',
    babyName: tableData.babyName || '',
    gender: tableData.gender || '',
    eventDate: tableData.eventDate || new Date().toISOString().split('T')[0],
    eventTime: tableData.eventTime || '',
    greeting: tableData.greeting || '¡Gracias por acompañarnos y celebrar la llegada de nuestro bebé!',
    coverImage: tableData.coverImage || '',
    slug,
    createdAt: new Date().toISOString(),
  });

  const tableId = newTableDoc.id;

  // Si hay productos seleccionados, agregar subcolección de items usando batch
  if (selectedProducts && selectedProducts.length > 0) {
    const batch = writeBatch(db);
    for (const prod of selectedProducts) {
      const itemRef = doc(collection(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION));
      const newItem: Omit<TableItem, 'id'> = {
        tableId,
        productId: prod.id,
        name: prod.name,
        description: prod.description || '',
        price: prod.price,
        imageUrl: prod.imageUrl || '',
        images: prod.images && prod.images.length > 0 ? prod.images : (prod.imageUrl ? [prod.imageUrl] : []),
        status: 'disponible',
        updatedAt: new Date().toISOString(),
      };
      batch.set(itemRef, newItem);
    }
    await batch.commit();
  }

  return { tableId, slug };
}

export async function addItemsToGiftTable(tableId: string, products: Product[]): Promise<void> {
  const batch = writeBatch(db);
  for (const prod of products) {
    const itemRef = doc(collection(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION));
    const newItem: Omit<TableItem, 'id'> = {
      tableId,
      productId: prod.id,
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      imageUrl: prod.imageUrl || '',
      images: prod.images && prod.images.length > 0 ? prod.images : (prod.imageUrl ? [prod.imageUrl] : []),
      status: 'disponible',
      updatedAt: new Date().toISOString(),
    };
    batch.set(itemRef, newItem);
  }
  await batch.commit();
}

/**
 * Actualiza el estado de un item de la mesa (disponible, reservado_en_tienda, seleccionado, pagado, dado_de_baja)
 */
export async function updateTableItemStatus(
  tableId: string,
  itemId: string,
  status: ItemStatus,
  donorInfo?: {
    donorName?: string;
    donorPhone?: string;
    paymentMethod?: 'tienda' | 'tarjeta' | 'otro';
    notes?: string;
  }
): Promise<void> {
  const itemRef = doc(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION, itemId);
  const updatePayload: Record<string, any> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (donorInfo?.donorName !== undefined) updatePayload.donorName = donorInfo.donorName;
  if (donorInfo?.donorPhone !== undefined) updatePayload.donorPhone = donorInfo.donorPhone;
  if (donorInfo?.paymentMethod !== undefined) updatePayload.paymentMethod = donorInfo.paymentMethod;
  if (donorInfo?.notes !== undefined) updatePayload.notes = donorInfo.notes;

  await updateDoc(itemRef, updatePayload);
}

/**
 * Reserva de forma atómica y segura un producto de la mesa (Control de Concurrencia y Race Condition)
 * Utiliza Firestore Transaction para asegurar que si dos usuarios intentan reservar el producto simultáneamente:
 * - El primero en confirmar adquiere la reserva y decrementa el stock en el inventario.
 * - El segundo usuario recibe error claro: "Este producto acaba de ser reservado por otro invitado."
 * - Si el producto está agotado en inventario (quantity <= 0), no permite la reserva: "Este producto se ha agotado en tienda."
 */
export async function reserveTableItemWithTransaction(
  tableId: string,
  itemId: string,
  targetStatus: 'reservado_en_tienda' | 'seleccionado',
  donorInfo?: {
    donorName?: string;
    donorPhone?: string;
    paymentMethod?: 'tienda' | 'tarjeta' | 'otro';
    notes?: string;
  }
): Promise<ReserveItemResult> {
  try {
    const itemDocRef = doc(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION, itemId);

    await runTransaction(db, async (transaction) => {
      const itemSnap = await transaction.get(itemDocRef);
      if (!itemSnap.exists()) {
        throw new Error('ITEM_NOT_FOUND');
      }

      const itemData = itemSnap.data() as TableItem;

      // Validación 1: Verificar si el item ya no está disponible
      if (itemData.status !== 'disponible') {
        throw new Error('ALREADY_RESERVED');
      }

      // Validación 2: Verificar stock en inventario principal si tiene productId
      let prodDocRef: ReturnType<typeof doc> | null = null;
      let currentProdStock: number | null = null;

      if (itemData.productId) {
        prodDocRef = doc(db, PRODUCTS_COLLECTION, itemData.productId);
        const prodSnap = await transaction.get(prodDocRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data() as Product;
          if (typeof prodData.quantity === 'number') {
            currentProdStock = prodData.quantity;
            if (currentProdStock <= 0) {
              throw new Error('OUT_OF_STOCK');
            }
          }
        }
      }

      // Actualizar estado del TableItem
      const updatePayload: Record<string, any> = {
        status: targetStatus,
        updatedAt: new Date().toISOString(),
      };
      if (donorInfo?.donorName !== undefined) updatePayload.donorName = donorInfo.donorName;
      if (donorInfo?.donorPhone !== undefined) updatePayload.donorPhone = donorInfo.donorPhone;
      if (donorInfo?.paymentMethod !== undefined) updatePayload.paymentMethod = donorInfo.paymentMethod;
      if (donorInfo?.notes !== undefined) updatePayload.notes = donorInfo.notes;

      transaction.update(itemDocRef, updatePayload);

      // Si existe producto en inventario, decrementar stock atómicamente y registrar trazabilidad de reserva
      if (prodDocRef && currentProdStock !== null) {
        const nextQty = Math.max(0, currentProdStock - 1);
        transaction.update(prodDocRef, {
          quantity: nextQty,
          lastReservation: {
            tableId,
            itemId,
            timestamp: new Date().toISOString(),
          },
        });
      }
    });

    return {
      success: true,
    };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('ALREADY_RESERVED')) {
      return {
        success: false,
        errorType: 'ALREADY_RESERVED',
        message: 'Este producto acaba de ser reservado por otro invitado.',
      };
    }
    if (errorMsg.includes('OUT_OF_STOCK')) {
      return {
        success: false,
        errorType: 'OUT_OF_STOCK',
        message: 'Este producto se ha agotado en el inventario de la tienda.',
      };
    }
    if (errorMsg.includes('ITEM_NOT_FOUND')) {
      return {
        success: false,
        errorType: 'ITEM_NOT_FOUND',
        message: 'El producto ya no existe en esta mesa de regalos.',
      };
    }

    console.error('Error en transacción de reserva:', error);
    return {
      success: false,
      errorType: 'UNKNOWN',
      message: 'Ocurrió un error inesperado al procesar la reserva. Por favor intenta de nuevo.',
    };
  }
}

/**
 * Permite que una misma persona reserve dos o más regalos dentro de la misma mesa,
 * ejecutando para cada regalo la validación atómica y decremento transaccional de inventario
 * según las reglas de Firestore (control de concurrencia, stock disponible y sin duplicados).
 */
export async function reserveMultipleTableItemsWithTransaction(
  tableId: string,
  items: TableItem[],
  targetStatus: 'reservado_en_tienda' | 'seleccionado',
  donorInfo?: {
    donorName?: string;
    donorPhone?: string;
    paymentMethod?: 'tienda' | 'tarjeta' | 'otro';
    notes?: string;
  }
): Promise<{
  success: boolean;
  reservedItems: TableItem[];
  failedItems: { item: TableItem; reason: string }[];
  message?: string;
}> {
  if (!items || items.length === 0) {
    return {
      success: false,
      reservedItems: [],
      failedItems: [],
      message: 'No se seleccionó ningún regalo para reservar.',
    };
  }

  const reservedItems: TableItem[] = [];
  const failedItems: { item: TableItem; reason: string }[] = [];

  // Procesamos de forma secuencial cada item utilizando la transacción atómica individual
  // para cumplir rigurosamente con la regla de seguridad de Firestore (decremento de 1 por producto por tx)
  for (const item of items) {
    const res = await reserveTableItemWithTransaction(tableId, item.id, targetStatus, donorInfo);
    if (res.success) {
      reservedItems.push(item);
    } else {
      failedItems.push({
        item,
        reason: res.message || 'No disponible',
      });
    }
  }

  if (reservedItems.length === items.length) {
    return {
      success: true,
      reservedItems,
      failedItems: [],
      message: `${reservedItems.length} regalo(s) reservado(s) exitosamente.`,
    };
  }

  if (reservedItems.length > 0) {
    return {
      success: true,
      reservedItems,
      failedItems,
      message: `Se reservaron ${reservedItems.length} de ${items.length} regalo(s). Algunos productos ya no estaban disponibles.`,
    };
  }

  return {
    success: false,
    reservedItems: [],
    failedItems,
    message: failedItems[0]?.reason || 'No fue posible reservar los regalos seleccionados.',
  };
}

/**
 * Actualiza campos generales de una mesa de regalos (nombre, fecha, hora, género, saludo, etc.)
 */
export async function updateGiftTable(
  tableId: string,
  updates: Partial<Omit<GiftTable, 'id' | 'createdAt'>>
): Promise<void> {
  const tableRef = doc(db, GIFT_TABLES_COLLECTION, tableId);
  const cleanUpdates: Record<string, any> = {};
  if (updates.familyName !== undefined) cleanUpdates.familyName = updates.familyName;
  if (updates.babyName !== undefined) cleanUpdates.babyName = updates.babyName;
  if (updates.gender !== undefined) cleanUpdates.gender = updates.gender;
  if (updates.eventDate !== undefined) cleanUpdates.eventDate = updates.eventDate;
  if (updates.eventTime !== undefined) cleanUpdates.eventTime = updates.eventTime;
  if (updates.greeting !== undefined) cleanUpdates.greeting = updates.greeting;
  if (updates.coverImage !== undefined) cleanUpdates.coverImage = updates.coverImage;
  if (updates.slug !== undefined) cleanUpdates.slug = updates.slug;

  await updateDoc(tableRef, cleanUpdates);
}

/**
 * Oyente en tiempo real de una mesa de regalos y del catálogo de inventario.
 * Si el administrador cambia el stock a 0 o modifica imágenes/datos, la mesa se actualiza
 * instantáneamente sin recargar la página.
 */
export function subscribeToGiftTableWithInventory(
  slug: string,
  onUpdate: (data: {
    table: GiftTable | null;
    items: TableItem[];
    extras: ExtraProduct[];
    storeConfig: StoreConfig;
    loading: boolean;
    notFound: boolean;
  }) => void
): () => void {
  let unsubTableDoc: (() => void) | null = null;
  let unsubItems: (() => void) | null = null;
  let unsubProducts: (() => void) | null = null;
  let unsubExtras: (() => void) | null = null;
  let unsubConfig: (() => void) | null = null;

  let currentTable: GiftTable | null = null;
  let rawItems: TableItem[] = [];
  let liveProducts: Product[] = [];
  let liveExtras: ExtraProduct[] = [];
  let liveConfig: StoreConfig = {
    whatsappNumber: '50368687046',
    storeName: 'Agu Agu - Artículos de Bebé',
    currencySymbol: '$',
  };

  const recomputeAndEmit = () => {
    if (!currentTable) {
      onUpdate({
        table: null,
        items: [],
        extras: liveExtras,
        storeConfig: liveConfig,
        loading: false,
        notFound: true,
      });
      return;
    }

    // Unir items con inventario en tiempo real (fotos actualizadas + validación de stock cero)
    const enrichedItems: TableItem[] = rawItems.map((item) => {
      const matchedProd = liveProducts.find(
        (p) =>
          item.productId === p.id ||
          areProductsMatching(p.name, item.name, p.description, item.description)
      );

      const isOutOfStock = Boolean(
        matchedProd && typeof matchedProd.quantity === 'number' && matchedProd.quantity <= 0
      );

      return {
        ...item,
        imageUrl: matchedProd?.imageUrl || item.imageUrl,
        images:
          matchedProd?.images && matchedProd.images.length > 0
            ? matchedProd.images
            : item.images || [item.imageUrl],
        price: matchedProd?.price !== undefined ? matchedProd.price : item.price,
        isOutOfStock,
        stockQuantity: matchedProd?.quantity,
      };
    });

    // Enriquecer productos extra con inventario
    const enrichedExtras: ExtraProduct[] = liveExtras.map((extra) => {
      const matchedProd = liveProducts.find(
        (p) =>
          extra.originalProductId === p.id ||
          areProductsMatching(p.name, extra.name, p.description, extra.description)
      );

      return {
        ...extra,
        imageUrl: matchedProd?.imageUrl || extra.imageUrl,
        images:
          matchedProd?.images && matchedProd.images.length > 0
            ? matchedProd.images
            : extra.images || [extra.imageUrl],
        price: matchedProd?.price !== undefined ? matchedProd.price : extra.price,
      };
    });

    const updatedTable = {
      ...currentTable,
      itemCount: enrichedItems.length,
      completedCount: enrichedItems.filter(
        (i) => i.status === 'reservado_en_tienda' || i.status === 'seleccionado' || i.status === 'pagado'
      ).length,
    };

    onUpdate({
      table: updatedTable,
      items: enrichedItems,
      extras: enrichedExtras,
      storeConfig: liveConfig,
      loading: false,
      notFound: false,
    });
  };

  // 1. Escuchar Configuración de tienda (documento store_settings)
  unsubConfig = onSnapshot(doc(db, CONFIG_COLLECTION, STORE_CONFIG_DOC), (snap) => {
    if (snap.exists()) {
      liveConfig = snap.data() as StoreConfig;
      recomputeAndEmit();
    }
  }, (err) => {
    console.error('Error escuchando config:', err);
  });

  // 2. Escuchar Inventario Principal (products)
  unsubProducts = onSnapshot(collection(db, PRODUCTS_COLLECTION), (snap) => {
    liveProducts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Product) }));
    recomputeAndEmit();
  }, (err) => {
    console.error('Error escuchando inventario:', err);
  });

  // 3. Escuchar Productos Extra (Detalles Especiales)
  unsubExtras = onSnapshot(collection(db, EXTRA_PRODUCTS_COLLECTION), (snap) => {
    liveExtras = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ExtraProduct) }));
    recomputeAndEmit();
  }, (err) => {
    console.error('Error escuchando productos extra:', err);
  });

  // 4. Buscar la mesa por slug
  const normalizedSlug = normalizeTableSlug(slug);
  const tablesColl = collection(db, GIFT_TABLES_COLLECTION);
  const q = query(tablesColl, where('slug', '==', normalizedSlug));

  const unsubTableQuery = onSnapshot(q, (snap) => {
    if (snap.empty) {
      currentTable = null;
      recomputeAndEmit();
      return;
    }

    const tableDoc = snap.docs[0];
    const data = tableDoc.data();
    if (data.status === 'deleted' || data.isDeleted === true) {
      currentTable = null;
      recomputeAndEmit();
      return;
    }
    currentTable = { id: tableDoc.id, ...data } as GiftTable;

    // Si aún no estamos escuchando los items de esta mesa, inicializar oyente
    if (!unsubItems) {
      const itemsColl = collection(db, GIFT_TABLES_COLLECTION, tableDoc.id, TABLE_ITEMS_SUBCOLLECTION);
      unsubItems = onSnapshot(itemsColl, (itemsSnap) => {
        rawItems = itemsSnap.docs.map((d) => ({
          id: d.id,
          tableId: tableDoc.id,
          ...d.data(),
        } as TableItem));
        recomputeAndEmit();
      }, (err) => {
        console.error('Error escuchando items de mesa:', err);
      });
    }

    recomputeAndEmit();
  }, (err) => {
    console.error('Error buscando mesa:', err);
    onUpdate({
      table: null,
      items: [],
      extras: [],
      storeConfig: liveConfig,
      loading: false,
      notFound: true,
    });
  });

  return () => {
    if (unsubTableQuery) unsubTableQuery();
    if (unsubTableDoc) unsubTableDoc();
    if (unsubItems) unsubItems();
    if (unsubProducts) unsubProducts();
    if (unsubExtras) unsubExtras();
    if (unsubConfig) unsubConfig();
  };
}

/**
 * Suscripción en tiempo real para el Panel Administrativo (AdminDashboard)
 * Sincroniza Productos, Mesas de Regalos, Extras y Configuración en vivo.
 */
export function subscribeToAdminData(
  onUpdate: (data: {
    products: Product[];
    tables: GiftTable[];
    deletedTables: DeletedGiftTable[];
    extras: ExtraProduct[];
    storeConfig: StoreConfig;
  }) => void
): () => void {
  let liveProducts: Product[] = [];
  let liveTables: GiftTable[] = [];
  let liveDeletedTables: DeletedGiftTable[] = [];
  let liveExtras: ExtraProduct[] = [];
  let liveConfig: StoreConfig = DEFAULT_STORE_CONFIG;

  const emit = () => {
    onUpdate({
      products: liveProducts,
      tables: liveTables,
      deletedTables: liveDeletedTables,
      extras: liveExtras,
      storeConfig: liveConfig,
    });
  };

  const unsubProducts = onSnapshot(collection(db, PRODUCTS_COLLECTION), (snap) => {
    liveProducts = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Product) }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    emit();
  }, (err) => {
    console.warn('Listener error on products:', err);
  });

  const unsubTables = onSnapshot(collection(db, GIFT_TABLES_COLLECTION), async (snap) => {
    const activeDocs = snap.docs.filter((d) => {
      const data = d.data();
      return data.status !== 'deleted' && data.isDeleted !== true;
    });

    const deletedDocs = snap.docs.filter((d) => {
      const data = d.data();
      return data.status === 'deleted' || data.isDeleted === true;
    });

    const rawTables = activeDocs.map((d) => ({ id: d.id, ...d.data() } as GiftTable));
    
    // Obtener recuentos actualizados para mesas activas
    const tablesWithCounts: GiftTable[] = await Promise.all(
      rawTables.map(async (t) => {
        try {
          const itemsColl = collection(db, GIFT_TABLES_COLLECTION, t.id, TABLE_ITEMS_SUBCOLLECTION);
          const itemsSnap = await getDocs(itemsColl);
          const itemCount = itemsSnap.size;
          const completedCount = itemsSnap.docs.filter((itemDoc) => {
            const st = itemDoc.data().status;
            return st === 'reservado_en_tienda' || st === 'seleccionado' || st === 'pagado';
          }).length;
          return { ...t, itemCount, completedCount };
        } catch {
          return t;
        }
      })
    );

    liveTables = tablesWithCounts.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    // Mapear mesas de la papelera desde los mismos documentos de gift_tables
    liveDeletedTables = deletedDocs.map((d) => {
      const data = d.data() as GiftTable & { isDeleted?: boolean; deletedAt?: string; deletedBy?: string; expiresAt?: string };
      const deletedAt = data.deletedAt || new Date().toISOString();
      const expiresAt = data.expiresAt || new Date(new Date(deletedAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
      return {
        id: d.id,
        familyName: data.familyName || 'Familia Invitada',
        babyName: data.babyName || '',
        gender: data.gender || '',
        eventDate: data.eventDate || '',
        eventTime: data.eventTime || '',
        slug: data.slug || '',
        greeting: data.greeting || '',
        coverImage: data.coverImage || '',
        createdAt: data.createdAt || deletedAt,
        deletedAt,
        expiresAt,
        deletedBy: data.deletedBy || 'admin',
        itemCount: data.itemCount || 0,
        completedCount: data.completedCount || 0,
        items: [],
        originalTableData: data,
      } as DeletedGiftTable;
    }).sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());

    emit();
  }, (err) => {
    console.warn('Listener error on gift_tables:', err);
  });

  const unsubExtras = onSnapshot(collection(db, EXTRA_PRODUCTS_COLLECTION), (snap) => {
    liveExtras = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ExtraProduct) }));
    emit();
  }, (err) => {
    console.warn('Listener error on extra_products:', err);
  });

  const unsubConfig = onSnapshot(doc(db, CONFIG_COLLECTION, STORE_CONFIG_DOC), (snap) => {
    if (snap.exists()) {
      liveConfig = snap.data() as StoreConfig;
      emit();
    }
  }, (err) => {
    console.warn('Listener error on store_settings:', err);
  });

  return () => {
    unsubProducts();
    unsubTables();
    unsubExtras();
    unsubConfig();
  };
}

/**
 * Suscripción en tiempo real para el Detalle de una Mesa en el Admin (GiftTableDetailView)
 */
export function subscribeToGiftTableDetail(
  tableId: string,
  onUpdate: (data: {
    table: GiftTable | null;
    items: TableItem[];
    inventory: Product[];
  }) => void
): () => void {
  let currentTable: GiftTable | null = null;
  let rawItems: TableItem[] = [];
  let liveProducts: Product[] = [];

  const emit = () => {
    // Cruzar items con inventario en tiempo real
    const enrichedItems = rawItems.map((item) => {
      const matched = liveProducts.find(
        (p) =>
          item.productId === p.id ||
          areProductsMatching(p.name, item.name, p.description, item.description)
      );
      return {
        ...item,
        imageUrl: matched?.imageUrl || item.imageUrl,
        images: matched?.images && matched.images.length > 0 ? matched.images : item.images,
        price: matched?.price !== undefined ? matched.price : item.price,
      };
    });

    if (currentTable) {
      currentTable.itemCount = enrichedItems.length;
      currentTable.completedCount = enrichedItems.filter(
        (i) => i.status === 'reservado_en_tienda' || i.status === 'seleccionado' || i.status === 'pagado'
      ).length;
    }

    onUpdate({
      table: currentTable,
      items: enrichedItems,
      inventory: liveProducts,
    });
  };

  const unsubTable = onSnapshot(doc(db, GIFT_TABLES_COLLECTION, tableId), (snap) => {
    if (snap.exists()) {
      currentTable = { id: snap.id, ...snap.data() } as GiftTable;
      emit();
    } else {
      currentTable = null;
      emit();
    }
  }, (err) => {
    console.warn('Listener error on table detail:', err);
  });

  const unsubItems = onSnapshot(
    collection(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION),
    (snap) => {
      rawItems = snap.docs.map((d) => ({
        id: d.id,
        tableId,
        ...d.data(),
      } as TableItem));
      emit();
    },
    (err) => {
      console.warn('Listener error on table items:', err);
    }
  );

  const unsubProducts = onSnapshot(collection(db, PRODUCTS_COLLECTION), (snap) => {
    liveProducts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Product) }));
    emit();
  }, (err) => {
    console.warn('Listener error on products in detail view:', err);
  });

  return () => {
    unsubTable();
    unsubItems();
    unsubProducts();
  };
}

/**
 * Función específica para dar de baja manualmente un producto en estado 'disponible' desde el admin
 */
export async function markItemAsDropped(tableId: string, itemId: string): Promise<void> {
  await updateTableItemStatus(tableId, itemId, 'dado_de_baja');
}

// =============================================================================
// PAPELERA DE MESAS DE REGALOS (deleted_gift_tables) Y PROTECCIÓN DE DATOS
// =============================================================================
// PAPELERA DE MESAS DE REGALOS Y PROTECCIÓN DE DATOS (SOFT DELETE)
// =============================================================================

/**
 * Mueve una mesa de regalos a la papelera (soft-delete) marcando su estado como 'deleted'
 * y estableciendo isDeleted: true junto con una retención de 15 días.
 * No borra ítems ni registros físicos para evitar pérdidas accidentales.
 */
export async function moveToTrashGiftTable(tableId: string, userEmail?: string): Promise<void> {
  if (!tableId || typeof tableId !== 'string') {
    throw new Error('ID de mesa inválido para enviar a la papelera.');
  }

  // 1. Verificar existencia del documento principal en gift_tables
  const tableRef = doc(db, GIFT_TABLES_COLLECTION, tableId);
  const tableSnap = await withTimeout(getDoc(tableRef), 5000, 'TIMEOUT_GET_TABLE_DOC');
  if (!tableSnap.exists()) {
    throw new Error('La mesa de regalos especificada no existe en la base de datos.');
  }

  // 2. Registrar marcas de tiempo y retención de 15 días
  const now = new Date();
  const deletedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

  // 3. Actualizar estado soft delete directamente en gift_tables
  try {
    await withTimeout(
      updateDoc(tableRef, {
        status: 'deleted',
        isDeleted: true,
        deletedAt,
        expiresAt,
        deletedBy: userEmail || auth.currentUser?.email || 'admin',
      }),
      8000,
      'TIMEOUT_UPDATE_TABLE_DOC'
    );
  } catch (err: any) {
    console.error('[MOVE TO TRASH ERROR]:', err);
    if (err?.code === 'permission-denied') {
      throw new Error('Permisos insuficientes en Firestore para mover esta mesa a la papelera.');
    }
    throw new Error(err?.message || 'No fue posible mover la mesa a la papelera.');
  }
}

/**
 * Obtiene todas las mesas que se encuentran actualmente en la papelera (soft-deleted).
 */
export async function getDeletedGiftTables(): Promise<DeletedGiftTable[]> {
  const deletedMap = new Map<string, DeletedGiftTable>();

  // 1. Obtener mesas con soft-delete de gift_tables
  try {
    const coll = collection(db, GIFT_TABLES_COLLECTION);
    const snap = await getDocs(coll);
    for (const d of snap.docs) {
      const data = d.data() as GiftTable & { isDeleted?: boolean; deletedAt?: string; deletedBy?: string; expiresAt?: string };
      if (data.status === 'deleted' || data.isDeleted === true) {
        const deletedAt = data.deletedAt || new Date().toISOString();
        const expiresAt = data.expiresAt || new Date(new Date(deletedAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
        deletedMap.set(d.id, {
          id: d.id,
          familyName: data.familyName || 'Familia Invitada',
          babyName: data.babyName || '',
          gender: data.gender || '',
          eventDate: data.eventDate || '',
          eventTime: data.eventTime || '',
          slug: data.slug || '',
          greeting: data.greeting || '',
          coverImage: data.coverImage || '',
          createdAt: data.createdAt || deletedAt,
          deletedAt,
          expiresAt,
          deletedBy: data.deletedBy || 'admin',
          itemCount: data.itemCount || 0,
          completedCount: data.completedCount || 0,
          items: [],
          originalTableData: data,
        });
      }
    }
  } catch (error) {
    console.warn('Advertencia al consultar mesas eliminadas en gift_tables:', error);
  }

  // 2. Compatibilidad retroactiva: Si existían registros en deleted_gift_tables, agregarlos
  try {
    const legacyColl = collection(db, DELETED_GIFT_TABLES_COLLECTION);
    const legacySnap = await getDocs(legacyColl);
    legacySnap.forEach((d) => {
      if (!deletedMap.has(d.id)) {
        deletedMap.set(d.id, { id: d.id, ...d.data() } as DeletedGiftTable);
      }
    });
  } catch (_) {
    // Ignorar si no hay permisos o no existe la colección legacy
  }

  return Array.from(deletedMap.values()).sort(
    (a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()
  );
}

/**
 * Restaura una mesa de la papelera de regreso al estado activo.
 * Conserva su ID original, todos sus table_items intactos y sus datos.
 */
export async function restoreGiftTable(tableId: string): Promise<void> {
  if (!tableId || typeof tableId !== 'string') {
    throw new Error('ID de mesa inválido para restaurar.');
  }

  const tableRef = doc(db, GIFT_TABLES_COLLECTION, tableId);
  const tableSnap = await withTimeout(getDoc(tableRef), 5000, 'TIMEOUT_GET_TABLE_DOC');

  if (tableSnap.exists()) {
    // Caso 1: La mesa existe en gift_tables con soft-delete; remover marcas
    try {
      await withTimeout(
        updateDoc(tableRef, {
          status: 'active',
          isDeleted: false,
          deletedAt: deleteField(),
          deletedBy: deleteField(),
          expiresAt: deleteField(),
        }),
        8000,
        'TIMEOUT_RESTORE_TABLE'
      );
    } catch (err: any) {
      console.error('[RESTORE TABLE ERROR]:', err);
      if (err?.code === 'permission-denied') {
        throw new Error('Permisos insuficientes en Firestore para restaurar esta mesa.');
      }
      throw new Error(err?.message || 'No fue posible restaurar la mesa.');
    }
  } else {
    // Caso 2: Registro legacy en deleted_gift_tables
    const legacyRef = doc(db, DELETED_GIFT_TABLES_COLLECTION, tableId);
    const legacySnap = await withTimeout(getDoc(legacyRef), 5000, 'TIMEOUT_GET_LEGACY_DOC');
    if (!legacySnap.exists()) {
      throw new Error('La mesa no fue encontrada para restaurar.');
    }
    const trashData = legacySnap.data() as DeletedGiftTable;
    const originalData = trashData.originalTableData || trashData;

    await setDoc(tableRef, {
      familyName: originalData.familyName || trashData.familyName || 'Familia Invitada',
      babyName: originalData.babyName || trashData.babyName || '',
      gender: originalData.gender || trashData.gender || '',
      eventDate: originalData.eventDate || trashData.eventDate || '',
      eventTime: originalData.eventTime || trashData.eventTime || '',
      slug: originalData.slug || trashData.slug || '',
      greeting: originalData.greeting || trashData.greeting || '',
      coverImage: originalData.coverImage || trashData.coverImage || '',
      createdAt: originalData.createdAt || trashData.createdAt || new Date().toISOString(),
      status: 'active',
      isDeleted: false,
    });
  }

  // Limpiar opcionalmente de deleted_gift_tables si existía
  try {
    const legacyRef = doc(db, DELETED_GIFT_TABLES_COLLECTION, tableId);
    await deleteDoc(legacyRef);
  } catch (_) {
    // Ignorar si ya no existe o falló silenciosamente
  }
}

/**
 * Elimina definitivamente y de forma permanente una mesa de la papelera de Firestore.
 * Limpia su documento en gift_tables junto con sus table_items en la subcolección.
 * NO toca productos, inventario, otras mesas ni reservas ajenas.
 */
export async function permanentlyDeleteGiftTable(tableId: string): Promise<void> {
  if (!tableId || typeof tableId !== 'string') {
    throw new Error('ID de mesa inválido para eliminación definitiva.');
  }

  const tableRef = doc(db, GIFT_TABLES_COLLECTION, tableId);
  const itemsColl = collection(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION);

  try {
    const itemsSnap = await getDocs(itemsColl);
    const batch = writeBatch(db);
    itemsSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(tableRef);
    await withTimeout(batch.commit(), 8000, 'TIMEOUT_PERMANENT_DELETE');
  } catch (err: any) {
    console.error('[PERMANENT DELETE ERROR]:', err);
    if (err?.code === 'permission-denied') {
      throw new Error('Permisos insuficientes en Firestore para eliminar definitivamente esta mesa.');
    }
    throw new Error(err?.message || 'Error al eliminar definitivamente la mesa de la papelera.');
  }

  // Limpiar también de deleted_gift_tables si existía
  try {
    const legacyRef = doc(db, DELETED_GIFT_TABLES_COLLECTION, tableId);
    await deleteDoc(legacyRef);
  } catch (_) {
    // Ignorar
  }
}

/**
 * Reemplazado por moveToTrashGiftTable: Al eliminar una mesa desde la UI del administrador,
 * se mueve a la papelera (soft-delete) para permitir su recuperación durante 15 días.
 */
export async function deleteGiftTable(tableId: string): Promise<void> {
  return moveToTrashGiftTable(tableId);
}

// -----------------------------------------------------------------------------
// CARGA INICIAL DE DATOS DE EJEMPLO / SEMILLA
// -----------------------------------------------------------------------------
// CATÁLOGO OFICIAL AGU AGU (15 PRODUCTOS CON FOTOS MULTI-ÁNGULO + EXTRAS)
// -----------------------------------------------------------------------------
export const AGU_AGU_PRODUCTS = OFFICIAL_AGU_AGU_PRODUCTS;
export const AGU_AGU_EXTRAS = OFFICIAL_AGU_AGU_EXTRAS;
export const BABY_UZI_PRODUCTS = OFFICIAL_AGU_AGU_PRODUCTS;
export const BABY_UZI_EXTRAS = OFFICIAL_AGU_AGU_EXTRAS;

/**
 * Desactivado permanentemente: La función 'Sincronizar catálogo Agu Agu'
 * fue eliminada para proteger el inventario real de la tienda.
 */
export async function resetCatalogWithAguAguData(): Promise<void> {
  console.warn('resetCatalogWithAguAguData ha sido desactivada permanentemente.');
  return Promise.resolve();
}

// Backward compatibility alias
export const resetCatalogWithBabyUziData = resetCatalogWithAguAguData;

/**
 * Desactivado permanentemente: El inventario se gestiona exclusivamente
 * de forma manual por la administradora.
 */
export async function seedInitialSampleDataIfEmpty(): Promise<boolean> {
  return false;
}
