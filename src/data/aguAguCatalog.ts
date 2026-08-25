import { Product, ExtraProduct } from '../types';

export interface CatalogPresetImage {
  name: string;
  category: string;
  urls: string[];
  thumbnail: string;
  description: string;
  defaultPrice: number;
}

// 15 PRODUCTOS OFICIALES AGU AGU CON MÚLTIPLES VISTAS, DETALLES Y COLORES
export const OFFICIAL_AGU_AGU_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: 'Asiento Ergonómico de Tina Antideslizante Nuby (0-6m)',
    description: 'Soporte ergonómico antideslizante para baño con base perforada de secado rápido, soporte suave para cabecita y diseño contorneado seguro para recién nacidos.',
    quantity: 12,
    price: 28.00,
    imageUrl: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584839800762-b9180749a04a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Higiene',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Cuna Corral Plegable 2 Niveles con Cambiador y Maletín',
    description: 'Cuna corral portátil 2 en 1 con segundo nivel para recién nacidos, cambiador superior desmontable, malla transpirable 360°, ruedas de freno y maletín de viaje.',
    quantity: 6,
    price: 145.00,
    imageUrl: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Habitación',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Coche Travel System 3 en 1 con Moisés Reversible Rosa Pastel',
    description: 'Cochecito completo 3 en 1 con moisés convertible en silla de paseo, chasis liviano de aluminio, capota extensible UPF 50+, canasta amplia y plegado compacto.',
    quantity: 5,
    price: 265.00,
    imageUrl: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Paseo',
    createdAt: new Date().toISOString(),
  },
  {
    name: "Set de 3 Biberones Dr. Brown's Options+ Anticólicos Cuello Ancho",
    description: 'Biberones con sistema patentado de ventilación interna anticólicos que previene gases y reflujo. Incluye tetinas de silicón médico y cepillo de limpieza.',
    quantity: 18,
    price: 32.00,
    imageUrl: 'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584839800762-b9180749a04a?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Alimentación',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Cuna Colecho Safety 1st Ajustable con Lateral Abatible',
    description: 'Moisés colecho con altura regulable de 6 posiciones, apertura lateral abatible para apego seguro junto a la cama de mamá, colchón transpirable y ruedas con bloqueo.',
    quantity: 4,
    price: 175.00,
    imageUrl: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Habitación',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Conjunto Playero 2 Piezas con Protección UV Camaleón',
    description: 'Camiseta de manga corta con protección UV UPF 50+ verde limón con diseño de camaleón y pantaloneta de baño turquesa con forro y cordón elástico ajustable.',
    quantity: 14,
    price: 22.00,
    imageUrl: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Ropa',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Enterizo Pelele de Algodón Acanalado Verde Salvia con Pies',
    description: 'Pijama enteriza con pies en suave algodón orgánico acanalado, con cremallera bidireccional de cuello a tobillos para cambio fácil de pañal y protector de barbilla.',
    quantity: 16,
    price: 18.00,
    imageUrl: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Ropa',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Enterizo de Algodón Kimono con Estampado de Ositos',
    description: 'Pelele enterizo tono beige arena con tierno estampado de ositos, botones cruzados estilo kimono para vestir al bebé sin incomodarlo y pies cerrados.',
    quantity: 15,
    price: 19.00,
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Ropa',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Vestido Infantil Manga Larga Beige con Falda a Cuadros y Osito',
    description: 'Vestido para bebé niña con corpiño acanalado color crema, aplique bordado de osito con lazo, volantes en hombros y falda tipo tartán a cuadros escoceses.',
    quantity: 10,
    price: 24.00,
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Ropa',
    createdAt: new Date().toISOString(),
  },
  {
    name: "Set Completo de Cuidado y Baño Johnson's Baby con Esponja",
    description: "Kit esencial de 7 piezas: Loción hidratante, Aceite puro de bebé, Shampoo suave, Talco para bebé, Jabón líquido bedtime relajante, toallitas y esponja de baño.",
    quantity: 20,
    price: 35.00,
    imageUrl: 'https://images.unsplash.com/photo-1584839800762-b9180749a04a?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1584839800762-b9180749a04a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Higiene',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Toallitas Húmedas Lucca Extra Grande x80 Unidades con Tapa',
    description: 'Toallitas húmedas hipoalergénicas tamaño extra grande con extracto de manzanilla y aloe vera, sin alcohol ni fragancias fuertes, con tapa hermética dispensadora.',
    quantity: 40,
    price: 4.50,
    imageUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Higiene',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Pañales Desechables Softcare Premium Soft Talla M/3 (50 u.)',
    description: 'Pañales ultra absorbentes con núcleo de distribución rápida, barreras elastizadas antifugas, capa respirable extra suave y hasta 12 horas de protección seca.',
    quantity: 30,
    price: 16.00,
    imageUrl: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Higiene',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Gimnasio de Estimulación Temprana Fisher-Price Selva Tropical',
    description: 'Tapete de juegos interactivo con arcos colgantes, tucán desmontable con luces y más de 20 min de melodías, jirafa suave, león sonajero y mordedores seguros.',
    quantity: 8,
    price: 58.00,
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Juguetes',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Andadera de Aprendizaje Musical 2 en 1 Asiento y Teclado Gris',
    description: 'Andadera con asiento acolchado giratorio lavable, bandeja de actividades con teclado de piano musical, luces de estrellas, juguetes giratorios y base antivuelco.',
    quantity: 7,
    price: 65.00,
    imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Juguetes',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Andadera Didáctica Caminador de Empuje Rosa con Pizarra Mágica',
    description: 'Caminador de empuje primeros pasos con centro de actividades desmontable, pizarrita mágica para dibujar, miniteléfono sonajero, pianito musical y engranajes.',
    quantity: 9,
    price: 36.00,
    imageUrl: 'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1560859251-d563a49c5e4a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
    ],
    category: 'Juguetes',
    createdAt: new Date().toISOString(),
  },
];

// PRODUCTOS EXTRA (VENTA CRUZADA FIJA)
export const OFFICIAL_AGU_AGU_EXTRAS: Omit<ExtraProduct, 'id'>[] = [
  {
    name: "Set Completo de Cuidado y Baño Johnson's Baby",
    description: 'Kit de 7 productos: Loción, Aceite, Shampoo, Talco, Jabón líquido Bedtime relajante, toallitas y esponja de baño.',
    price: 35.00,
    imageUrl: 'https://images.unsplash.com/photo-1584839800762-b9180749a04a?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1584839800762-b9180749a04a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80',
    ],
    badge: 'Favorito',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Toallitas Húmedas Lucca Extra Grande x80 Unidades',
    description: 'Toallitas hipoalergénicas con manzanilla y aloe vera con tapa dispensadora hermética.',
    price: 4.50,
    imageUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
    ],
    badge: 'Esencial',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Pañales Softcare Premium Soft M/3 (50 unidades)',
    description: 'Paquete de pañales ultra suaves y absorbentes hasta 12 horas con barreras antifugas.',
    price: 16.00,
    imageUrl: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&w=800&q=80',
    ],
    badge: 'Esencial',
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Envoltura de Regalo de Lujo + Tarjeta Caligrafiada',
    description: 'Caja rígida con papel de seda, lazo de satén y tarjeta dedicatoria personalizada con caligrafía.',
    price: 6.50,
    imageUrl: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=800&q=80',
    ],
    badge: 'Detalle tierno',
    createdAt: new Date().toISOString(),
  },
];

// Re-export aliases for backwards compatibility
export const OFFICIAL_BABY_UZI_PRODUCTS = OFFICIAL_AGU_AGU_PRODUCTS;
export const OFFICIAL_BABY_UZI_EXTRAS = OFFICIAL_AGU_AGU_EXTRAS;
