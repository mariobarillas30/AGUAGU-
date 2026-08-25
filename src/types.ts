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
  eventDate: string; // YYYY-MM-DD
  slug: string;
  greeting?: string;
  coverImage?: string;
  createdAt: string | number;
  itemCount?: number;
  completedCount?: number;
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
  customWhatsAppTemplate?: string;
}
