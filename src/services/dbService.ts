import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Product, GiftTable, TableItem, ExtraProduct, StoreConfig, ItemStatus, ReserveItemResult } from '../types';
import {
  OFFICIAL_AGU_AGU_PRODUCTS,
  OFFICIAL_AGU_AGU_EXTRAS,
} from '../data/aguAguCatalog';

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
const EXTRA_PRODUCTS_COLLECTION = 'extra_products';
const CONFIG_COLLECTION = 'config';
const STORE_CONFIG_DOC = 'store_settings';

// Default config (El Salvador: +503 6868 7046)
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  whatsappNumber: '50368687046',
  storeName: 'Agu Agu - Artículos de Bebé',
  storeAddress: 'Tienda Oficial Agu Agu',
  currencySymbol: '$',
};

// Generador de slug único aleatorio
export function generateRandomSlug(baseName: string): string {
  // Limpiar caracteres especiales
  const cleanBase = baseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);

  // Sufijo aleatorio de 5 caracteres alfanuméricos
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return cleanBase ? `${cleanBase}-${randomSuffix}` : `mesa-${randomSuffix}`;
}

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
  const docRef = await addDoc(coll, {
    ...product,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
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
 * Sincroniza todas las mesas de regalo y sus productos con el inventario principal
 */
export async function syncAllTablesWithInventory(): Promise<void> {
  try {
    const [productsSnap, tablesSnap] = await Promise.all([
      getDocs(collection(db, PRODUCTS_COLLECTION)),
      getDocs(collection(db, GIFT_TABLES_COLLECTION)),
    ]);

    const prods = productsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Product) }));

    for (const tableDoc of tablesSnap.docs) {
      const itemsColl = collection(db, GIFT_TABLES_COLLECTION, tableDoc.id, TABLE_ITEMS_SUBCOLLECTION);
      const itemsSnap = await getDocs(itemsColl);

      for (const itemDoc of itemsSnap.docs) {
        const itemData = itemDoc.data() as TableItem;
        const matchedProd = prods.find(
          (p) =>
            itemData.productId === p.id ||
            areProductsMatching(p.name, itemData.name, p.description, itemData.description)
        );

        if (matchedProd) {
          const itemUpdate: Partial<TableItem> = {
            productId: matchedProd.id,
          };

          let hasChanges = false;
          if (matchedProd.imageUrl && matchedProd.imageUrl !== itemData.imageUrl) {
            itemUpdate.imageUrl = matchedProd.imageUrl;
            hasChanges = true;
          }
          if (
            matchedProd.images &&
            matchedProd.images.length > 0 &&
            JSON.stringify(matchedProd.images) !== JSON.stringify(itemData.images)
          ) {
            itemUpdate.images = matchedProd.images;
            hasChanges = true;
          }
          if (matchedProd.name && matchedProd.name !== itemData.name) {
            itemUpdate.name = matchedProd.name;
            hasChanges = true;
          }
          if (matchedProd.description && matchedProd.description !== itemData.description) {
            itemUpdate.description = matchedProd.description;
            hasChanges = true;
          }
          if (matchedProd.price && matchedProd.price !== itemData.price) {
            itemUpdate.price = matchedProd.price;
            hasChanges = true;
          }

          if (hasChanges) {
            await updateDoc(
              doc(db, GIFT_TABLES_COLLECTION, tableDoc.id, TABLE_ITEMS_SUBCOLLECTION, itemDoc.id),
              itemUpdate
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Error en syncAllTablesWithInventory:', err);
  }
}

/**
 * Sincroniza todos los productos extra (Detalles Especiales) con el inventario principal
 */
export async function syncAllExtrasWithInventory(): Promise<void> {
  try {
    const [productsSnap, extrasSnap] = await Promise.all([
      getDocs(collection(db, PRODUCTS_COLLECTION)),
      getDocs(collection(db, EXTRA_PRODUCTS_COLLECTION)),
    ]);

    const prods = productsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Product) }));

    for (const extraDoc of extrasSnap.docs) {
      const extraData = extraDoc.data() as ExtraProduct;
      const matchedProd = prods.find(
        (p) =>
          extraData.originalProductId === p.id ||
          areProductsMatching(p.name, extraData.name, p.description, extraData.description)
      );

      if (matchedProd) {
        const extraUpdate: Partial<ExtraProduct> = {
          originalProductId: matchedProd.id,
        };

        let hasChanges = false;
        if (matchedProd.imageUrl && matchedProd.imageUrl !== extraData.imageUrl) {
          extraUpdate.imageUrl = matchedProd.imageUrl;
          hasChanges = true;
        }
        if (
          matchedProd.images &&
          matchedProd.images.length > 0 &&
          JSON.stringify(matchedProd.images) !== JSON.stringify(extraData.images)
        ) {
          extraUpdate.images = matchedProd.images;
          hasChanges = true;
        }

        if (hasChanges) {
          await updateDoc(doc(db, EXTRA_PRODUCTS_COLLECTION, extraDoc.id), extraUpdate);
        }
      }
    }
  } catch (err) {
    console.error('Error en syncAllExtrasWithInventory:', err);
  }
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await updateDoc(docRef, product);

  // 1. Sincronización automática con Productos Extra (Detalles Especiales / Venta Cruzada)
  try {
    const fullProdSnap = await getDoc(docRef);
    const currentProd = fullProdSnap.exists() ? (fullProdSnap.data() as Product) : null;
    const prodName = product.name || currentProd?.name || '';
    const prodDesc = product.description || currentProd?.description;
    const finalImageUrl = product.imageUrl || currentProd?.imageUrl;
    const finalImages = product.images || currentProd?.images;

    const extrasColl = collection(db, EXTRA_PRODUCTS_COLLECTION);
    const extrasSnap = await getDocs(extrasColl);

    for (const extraDoc of extrasSnap.docs) {
      const extraData = extraDoc.data() as ExtraProduct;
      const isMatch =
        extraData.originalProductId === id ||
        areProductsMatching(prodName, extraData.name, prodDesc, extraData.description);

      if (isMatch) {
        const extraUpdate: Partial<ExtraProduct> = {
          originalProductId: id,
        };

        if (finalImageUrl) extraUpdate.imageUrl = finalImageUrl;
        if (finalImages && finalImages.length > 0) extraUpdate.images = finalImages;
        if (product.price && extraData.price === currentProd?.price) extraUpdate.price = product.price;

        await updateDoc(doc(db, EXTRA_PRODUCTS_COLLECTION, extraDoc.id), extraUpdate);
      }
    }
  } catch (syncErr) {
    console.error('Error sincronizando producto extra:', syncErr);
  }

  // 2. Sincronización automática con mesas de regalos activas
  try {
    const tablesColl = collection(db, GIFT_TABLES_COLLECTION);
    const tablesSnap = await getDocs(tablesColl);
    for (const tDoc of tablesSnap.docs) {
      const itemsColl = collection(db, GIFT_TABLES_COLLECTION, tDoc.id, TABLE_ITEMS_SUBCOLLECTION);
      const itemsSnap = await getDocs(itemsColl);
      for (const iDoc of itemsSnap.docs) {
        const iData = iDoc.data() as TableItem;
        if (iData.productId === id || (product.name && areProductsMatching(product.name, iData.name))) {
          const itemUpdate: Partial<TableItem> = {};
          if (product.imageUrl) itemUpdate.imageUrl = product.imageUrl;
          if (product.images && product.images.length > 0) itemUpdate.images = product.images;
          if (product.price) itemUpdate.price = product.price;
          if (product.name) itemUpdate.name = product.name;
          if (product.description) itemUpdate.description = product.description;

          await updateDoc(
            doc(db, GIFT_TABLES_COLLECTION, tDoc.id, TABLE_ITEMS_SUBCOLLECTION, iDoc.id),
            itemUpdate
          );
        }
      }
    }
  } catch (tableSyncErr) {
    console.error('Error sincronizando items de mesas:', tableSyncErr);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await deleteDoc(docRef);
}

// -----------------------------------------------------------------------------
// PRODUCTOS EXTRA / DETALLES ESPECIALES (extra_products)
// -----------------------------------------------------------------------------
export async function getExtraProducts(): Promise<ExtraProduct[]> {
  try {
    // Sincronizar automáticamente con inventario por si hubo cambios recientes
    await syncAllExtrasWithInventory();

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
  const docRef = await addDoc(coll, {
    ...extra,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateExtraProduct(id: string, extra: Partial<ExtraProduct>): Promise<void> {
  const docRef = doc(db, EXTRA_PRODUCTS_COLLECTION, id);
  await updateDoc(docRef, extra);
}

export async function deleteExtraProduct(id: string): Promise<void> {
  const docRef = doc(db, EXTRA_PRODUCTS_COLLECTION, id);
  await deleteDoc(docRef);
}

// -----------------------------------------------------------------------------
// MESAS DE REGALO (gift_tables)
// -----------------------------------------------------------------------------
export async function getGiftTables(): Promise<GiftTable[]> {
  try {
    // Sincronizar automáticamente mesas con inventario
    await syncAllTablesWithInventory();

    const coll = collection(db, GIFT_TABLES_COLLECTION);
    const snap = await getDocs(coll);
    const tables: GiftTable[] = [];
    
    for (const d of snap.docs) {
      const tableData = { id: d.id, ...d.data() } as GiftTable;
      
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
    const coll = collection(db, GIFT_TABLES_COLLECTION);
    const q = query(coll, where('slug', '==', slug.trim().toLowerCase()));
    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const tableDoc = snap.docs[0];
    const table = { id: tableDoc.id, ...tableDoc.data() } as GiftTable;

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

    const table = { id: snap.id, ...snap.data() } as GiftTable;
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
  // Generar o usar slug base
  let slug = tableData.customSlug
    ? tableData.customSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
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
    eventDate: tableData.eventDate || new Date().toISOString().split('T')[0],
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

      // Si existe producto en inventario, decrementar stock atómicamente
      if (prodDocRef && currentProdStock !== null) {
        const nextQty = Math.max(0, currentProdStock - 1);
        transaction.update(prodDocRef, {
          quantity: nextQty,
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

  // 1. Escuchar Configuración de tienda
  unsubConfig = onSnapshot(doc(db, CONFIG_COLLECTION, 'store'), (snap) => {
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
  const tablesColl = collection(db, GIFT_TABLES_COLLECTION);
  const q = query(tablesColl, where('slug', '==', slug.trim().toLowerCase()));

  const unsubTableQuery = onSnapshot(q, (snap) => {
    if (snap.empty) {
      currentTable = null;
      recomputeAndEmit();
      return;
    }

    const tableDoc = snap.docs[0];
    currentTable = { id: tableDoc.id, ...tableDoc.data() } as GiftTable;

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
 * Función específica para dar de baja manualmente un producto en estado 'disponible' desde el admin
 */
export async function markItemAsDropped(tableId: string, itemId: string): Promise<void> {
  await updateTableItemStatus(tableId, itemId, 'dado_de_baja');
}

export async function deleteGiftTable(tableId: string): Promise<void> {
  // Eliminar items de la subcolección
  const itemsColl = collection(db, GIFT_TABLES_COLLECTION, tableId, TABLE_ITEMS_SUBCOLLECTION);
  const itemsSnap = await getDocs(itemsColl);
  const batch = writeBatch(db);
  itemsSnap.forEach((d) => {
    batch.delete(d.ref);
  });
  batch.delete(doc(db, GIFT_TABLES_COLLECTION, tableId));
  await batch.commit();
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

export async function resetCatalogWithAguAguData(): Promise<void> {
  // 1. Obtener y borrar productos existentes
  const currentProds = await getProducts();
  const currentExtras = await getExtraProducts();
  
  const batch = writeBatch(db);
  for (const p of currentProds) {
    batch.delete(doc(db, PRODUCTS_COLLECTION, p.id));
  }
  for (const e of currentExtras) {
    batch.delete(doc(db, EXTRA_PRODUCTS_COLLECTION, e.id));
  }
  await batch.commit();

  // 2. Insertar catálogo oficial Agu Agu
  const insertBatch = writeBatch(db);
  const createdProducts: Product[] = [];
  for (const p of OFFICIAL_AGU_AGU_PRODUCTS) {
    const docRef = doc(collection(db, PRODUCTS_COLLECTION));
    insertBatch.set(docRef, p);
    createdProducts.push({ id: docRef.id, ...p });
  }
  for (const e of OFFICIAL_AGU_AGU_EXTRAS) {
    const docRef = doc(collection(db, EXTRA_PRODUCTS_COLLECTION));
    insertBatch.set(docRef, e);
  }
  await insertBatch.commit();
  await updateStoreConfig(DEFAULT_STORE_CONFIG);

  // 3. Sincronizar o actualizar la mesa demo si existe
  try {
    const tables = await getGiftTables();
    const demoTable = tables.find(t => t.slug === 'baby-mateo-2026') || tables[0];
    if (demoTable) {
      // Limpiar items anteriores y recargar con nuevos productos con multi-fotos
      const oldItems = await getTableItems(demoTable.id);
      const itemsBatch = writeBatch(db);
      for (const item of oldItems) {
        itemsBatch.delete(doc(db, GIFT_TABLES_COLLECTION, demoTable.id, TABLE_ITEMS_SUBCOLLECTION, item.id));
      }
      const sampleToAdd = createdProducts.slice(0, 6);
      sampleToAdd.forEach((prod, index) => {
        const itemRef = doc(collection(db, GIFT_TABLES_COLLECTION, demoTable.id, TABLE_ITEMS_SUBCOLLECTION));
        let status: ItemStatus = 'disponible';
        let donorName = '';
        if (index === 2) {
          status = 'reservado_en_tienda';
          donorName = 'Tía Carmen y Familia';
        } else if (index === 3) {
          status = 'seleccionado';
          donorName = 'Padrinos David y Sofía';
        }
        itemsBatch.set(itemRef, {
          tableId: demoTable.id,
          productId: prod.id,
          name: prod.name,
          description: prod.description,
          price: prod.price,
          imageUrl: prod.imageUrl,
          images: prod.images || (prod.imageUrl ? [prod.imageUrl] : []),
          status,
          donorName: donorName || undefined,
          updatedAt: new Date().toISOString(),
        });
      });
      await itemsBatch.commit();
    }
  } catch (err) {
    console.error('Error sincronizando mesa demo:', err);
  }
}

// Backward compatibility alias
export const resetCatalogWithBabyUziData = resetCatalogWithAguAguData;

export async function seedInitialSampleDataIfEmpty(): Promise<boolean> {
  try {
    const coll = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(coll);
    
    if (!snap.empty) {
      return false; // Ya tiene productos en Firestore
    }

    // Insertar productos oficiales de Agu Agu
    const productBatch = writeBatch(db);
    const createdProductDocs: Product[] = [];

    for (const p of OFFICIAL_AGU_AGU_PRODUCTS) {
      const docRef = doc(collection(db, PRODUCTS_COLLECTION));
      productBatch.set(docRef, p);
      createdProductDocs.push({ id: docRef.id, ...p });
    }

    for (const e of OFFICIAL_AGU_AGU_EXTRAS) {
      const docRef = doc(collection(db, EXTRA_PRODUCTS_COLLECTION));
      productBatch.set(docRef, e);
    }

    await productBatch.commit();

    // Crear una mesa de regalo de demostración para poder probar de inmediato
    const demoTableDoc = doc(collection(db, GIFT_TABLES_COLLECTION));
    const demoSlug = 'baby-mateo-2026';
    
    await setDoc(demoTableDoc, {
      familyName: 'Familia García Rodríguez',
      babyName: 'Mateo',
      eventDate: '2026-10-15',
      greeting: '¡Estamos muy emocionados por la llegada de nuestro pequeño Mateo! Gracias por ser parte de este momento tan especial para nosotros.',
      slug: demoSlug,
      createdAt: new Date().toISOString(),
    });

    // Agregar items a la mesa demo
    const tableItemsBatch = writeBatch(db);
    const demoItems = createdProductDocs.slice(0, 6);
    
    demoItems.forEach((prod, index) => {
      const itemRef = doc(collection(db, GIFT_TABLES_COLLECTION, demoTableDoc.id, TABLE_ITEMS_SUBCOLLECTION));
      let status: ItemStatus = 'disponible';
      let donorName = '';
      
      if (index === 2) {
        status = 'reservado_en_tienda';
        donorName = 'Tía Carmen y Familia';
      } else if (index === 3) {
        status = 'seleccionado';
        donorName = 'Padrinos David y Sofía';
      }

      tableItemsBatch.set(itemRef, {
        tableId: demoTableDoc.id,
        productId: prod.id,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        imageUrl: prod.imageUrl,
        images: prod.images || (prod.imageUrl ? [prod.imageUrl] : []),
        status,
        donorName: donorName || undefined,
        updatedAt: new Date().toISOString(),
      });
    });

    await tableItemsBatch.commit();
    await updateStoreConfig(DEFAULT_STORE_CONFIG);

    return true;
  } catch (error) {
    console.error('Error al inicializar datos de muestra:', error);
    return false;
  }
}
