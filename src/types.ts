export type ItemStatus =
  | 'disponible'
  | 'reservado_en_tienda'
  | 'seleccionado'
  | 'pagado'
  | 'dado_de_baja';

export interface Product {
  id: string;
  name: string;
  description: string;
  quantity: number; // Stock disponible en inventario
  price: number;
  imageUrl: string; // Foto principal / portada
  images?: string[]; // Varias fotos (diferentes vistas, ángulos o colores)
  category?: string;
  createdAt?: string | number;
  lastReservation?: {
    tableId: string;
    itemId: string;
    timestamp: string;
  };
}

export interface TableItem {
  id: string;
  tableId: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  images?: string[]; // Varias fotos (diferentes vistas, ángulos o colores)
  status: ItemStatus;
  donorName?: string;
  donorPhone?: string;
  donorEmail?: string;
  paymentMethod?: 'tienda' | 'tarjeta' | 'otro';
  updatedAt?: string | number;
  notes?: string;
  isOutOfStock?: boolean; // Derivado en tiempo real según el inventario general
  stockQuantity?: number; // Cantidad disponible en tiempo real en almacén/tienda
}

export interface ReserveItemResult {
  success: boolean;
  errorType?: 'ALREADY_RESERVED' | 'OUT_OF_STOCK' | 'ITEM_NOT_FOUND' | 'UNKNOWN';
  message?: string;
}

export interface GiftTable {
  id: string;
  familyName: string;
  babyName?: string;
  gender?: string; // e.g. 'Niño', 'Niña', 'Por revelar', 'No especificado'
  eventDate: string; // YYYY-MM-DD
  eventTime?: string; // e.g. '15:00' o '03:00 PM'
  slug: string;
  greeting?: string;
  coverImage?: string;
  createdAt: string | number;
  itemCount?: number;
  completedCount?: number;
  status?: string; // 'active' | 'deleted' | 'inactiva'
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  expiresAt?: string;
}

export interface ExtraProduct {
  id: string;
  originalProductId?: string; // ID del producto vinculado en inventario general
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  images?: string[]; // Varias fotos
  badge?: string; // ej: "Favorito", "Esencial", "Detalle tierno"
  createdAt?: string | number;
}

export interface StoreConfig {
  whatsappNumber: string; // ej: 50368687046 (código país El Salvador + número sin símbolos)
  storeName: string;
  storeAddress?: string;
  currencySymbol: string; // ej: "$" o "Q" o "€"
  logoUrl?: string; // Logotipo oficial personalizado de la tienda
  customWhatsAppTemplate?: string;
}

export interface DeletedGiftTable {
  id: string; // ID original de la mesa
  familyName: string;
  babyName?: string;
  gender?: string;
  eventDate: string;
  eventTime?: string;
  slug: string;
  greeting?: string;
  coverImage?: string;
  createdAt: string | number;
  deletedAt: string; // Fecha y hora en que fue enviada a la papelera (ISO string)
  expiresAt: string; // Fecha límite de retención (~15 días posteriores, ISO string)
  deletedBy?: string;
  itemCount: number;
  completedCount: number;
  items: TableItem[]; // Subcolección table_items completa con estados y reservas
  originalTableData?: Partial<GiftTable>;
}

export interface AdminProfile {
  uid: string;
  email?: string;
  photoURL?: string;
  displayName?: string;
  updatedAt?: string;
}
