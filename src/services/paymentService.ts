/**
 * ==============================================================================
 * MÓDULO DE PROCESAMIENTO DE PAGOS Y MENSAJES FORMALES DE WHATSAPP
 * ==============================================================================
 * 
 * Reglas de Mensajería:
 * - Redacción formal, clara y estrictamente profesional.
 * - Sin emojis en ninguna sección del mensaje.
 * - Estructura ordenada con cantidades, precios individuales y total general.
 * - Compatibilidad total con móviles (Android, iOS y navegadores web)
 *   utilizando https://api.whatsapp.com/send con codificación URI precisa.
 * ==============================================================================
 */

export interface SelectedGiftItemInfo {
  name: string;
  price: number;
  quantity?: number;
}

export interface CardPaymentParams {
  donorName: string;
  donorPhone?: string;
  tableName: string;
  tableSlug?: string;
  tableId?: string;
  productName?: string;
  productPrice?: number;
  items?: SelectedGiftItemInfo[];
  totalPrice?: number;
  currencySymbol?: string;
  whatsappNumber: string;
  storeName?: string;
  donorMessage?: string;
}

export interface StoreReservationParams {
  donorName: string;
  donorPhone: string;
  tableName: string;
  tableSlug?: string;
  tableId?: string;
  productName?: string;
  productPrice?: number;
  items?: SelectedGiftItemInfo[];
  totalPrice?: number;
  currencySymbol?: string;
  whatsappNumber: string;
  storeName?: string;
  donorMessage?: string;
}

export interface PaymentIntentResult {
  success: boolean;
  actionType: 'whatsapp_redirect' | 'payment_gateway_redirect';
  redirectUrl: string;
  referenceId: string;
  message?: string;
}

/**
 * Limpia y formatea un número telefónico para WhatsApp (solo dígitos numéricos).
 * Por defecto utiliza el número oficial de El Salvador: 50368687046.
 */
export function sanitizeWhatsAppNumber(rawNumber?: string): string {
  if (!rawNumber) return '50368687046';
  const digits = rawNumber.replace(/[^\d]/g, '');
  if (!digits || digits === '50212345678' || digits === '50370000000' || digits === '50363031927') {
    return '50368687046';
  }
  return digits;
}

/**
 * Construye una URL universal de WhatsApp compatible con Android, iOS y navegadores de escritorio.
 * Maneja saltos de línea y espacios con codificación estricta encodeURIComponent.
 */
export function buildUniversalWhatsAppUrl(phoneNumber: string, messageText: string): string {
  const cleanDigits = sanitizeWhatsAppNumber(phoneNumber);
  const encodedText = encodeURIComponent(messageText);
  return `https://api.whatsapp.com/send?phone=${cleanDigits}&text=${encodedText}`;
}

/**
 * Abre de forma segura el enlace de WhatsApp según el dispositivo del usuario.
 */
export function openWhatsAppSafely(whatsappUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // En móviles, window.location.href activa el intent de la app nativa de forma fiable
      window.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.warn('Error al abrir WhatsApp:', err);
  }
}

/**
 * Genera el mensaje y enlace formal de WhatsApp para reserva en tienda física.
 * Estrictamente sin emojis, con desglose de regalos, cantidades, precios y total.
 */
export async function processStoreReservationIntent(
  params: StoreReservationParams
): Promise<PaymentIntentResult> {
  const {
    donorName,
    donorPhone,
    tableName,
    tableSlug,
    tableId,
    productName,
    productPrice,
    items,
    totalPrice: explicitTotal,
    currencySymbol = '$',
    whatsappNumber,
    donorMessage,
  } = params;

  const referenceId = `TIENDA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Consolidar lista de regalos
  const giftList: SelectedGiftItemInfo[] = [];
  if (items && items.length > 0) {
    giftList.push(...items);
  } else if (productName && productPrice !== undefined) {
    giftList.push({ name: productName, price: productPrice, quantity: 1 });
  }

  const calculatedTotal = explicitTotal !== undefined
    ? explicitTotal
    : giftList.reduce((acc, g) => acc + g.price * (g.quantity || 1), 0);

  const mesaIdentifier = tableSlug ? `${tableName} (#mesa/${tableSlug})` : tableName;

  // Construcción del mensaje formal (SIN EMOJIS)
  const lines: (string | null)[] = [
    `Estimado equipo de Agu Agu,`,
    ``,
    `Le saluda ${donorName.trim()}. Deseo confirmar la reserva en tienda física de regalo(s) correspondiente a la siguiente mesa de regalos:`,
    ``,
    `Mesa / Evento: ${mesaIdentifier}`,
    `Modalidad: Pago y retiro en tienda física`,
    ``,
    `Detalle de regalo(s) seleccionado(s):`,
  ];

  giftList.forEach((gift, idx) => {
    const qty = gift.quantity || 1;
    const subtotal = (gift.price * qty).toFixed(2);
    lines.push(`- ${gift.name} | Cantidad: ${qty} | Precio: ${currencySymbol}${subtotal}`);
  });

  lines.push(
    ``,
    `Total a cancelar en tienda: ${currencySymbol}${calculatedTotal.toFixed(2)}`,
    `Codigo de referencia: ${referenceId}`,
    ``,
    `Datos de contacto de quien reserva:`,
    `- Nombre: ${donorName.trim()}`,
    `- Telefono: ${donorPhone.trim()}`
  );

  if (donorMessage?.trim()) {
    lines.push(`- Mensaje para la familia: "${donorMessage.trim()}"`);
  }

  lines.push(
    ``,
    `Agradezco me confirmen la disponibilidad del pedido y los pasos para presentarme a realizar el pago en tienda.`,
    ``,
    `Atentamente,`,
    `${donorName.trim()}`
  );

  const fullMessage = lines.filter((l) => l !== null).join('\n');
  const whatsappUrl = buildUniversalWhatsAppUrl(whatsappNumber, fullMessage);

  openWhatsAppSafely(whatsappUrl);

  return {
    success: true,
    actionType: 'whatsapp_redirect',
    redirectUrl: whatsappUrl,
    referenceId,
    message: 'Redirigiendo a WhatsApp para dar seguimiento a la reserva en tienda.',
  };
}

/**
 * Genera el mensaje y enlace formal de WhatsApp para pago con tarjeta.
 * Estrictamente sin emojis, con desglose de regalos, cantidades, precios y total.
 */
export async function processCardPaymentIntent(
  params: CardPaymentParams
): Promise<PaymentIntentResult> {
  const {
    donorName,
    donorPhone,
    tableName,
    tableSlug,
    productName,
    productPrice,
    items,
    totalPrice: explicitTotal,
    currencySymbol = '$',
    whatsappNumber,
    donorMessage,
  } = params;

  const referenceId = `REG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Consolidar lista de regalos
  const giftList: SelectedGiftItemInfo[] = [];
  if (items && items.length > 0) {
    giftList.push(...items);
  } else if (productName && productPrice !== undefined) {
    giftList.push({ name: productName, price: productPrice, quantity: 1 });
  }

  const calculatedTotal = explicitTotal !== undefined
    ? explicitTotal
    : giftList.reduce((acc, g) => acc + g.price * (g.quantity || 1), 0);

  const mesaIdentifier = tableSlug ? `${tableName} (#mesa/${tableSlug})` : tableName;

  // Construcción del mensaje formal (SIN EMOJIS)
  const lines: (string | null)[] = [
    `Estimado equipo de Agu Agu,`,
    ``,
    `Le saluda ${donorName.trim()}. Deseo realizar el pago con tarjeta para el/los siguiente(s) regalo(s) de la mesa de regalos:`,
    ``,
    `Mesa / Evento: ${mesaIdentifier}`,
    `Modalidad: Pago con tarjeta de credito / debito`,
    ``,
    `Detalle de regalo(s) seleccionado(s):`,
  ];

  giftList.forEach((gift) => {
    const qty = gift.quantity || 1;
    const subtotal = (gift.price * qty).toFixed(2);
    lines.push(`- ${gift.name} | Cantidad: ${qty} | Precio: ${currencySymbol}${subtotal}`);
  });

  lines.push(
    ``,
    `Total a pagar: ${currencySymbol}${calculatedTotal.toFixed(2)}`,
    `Codigo de referencia: ${referenceId}`,
    ``,
    `Datos de contacto:`,
    `- Nombre: ${donorName.trim()}`,
    donorPhone?.trim() ? `- Telefono: ${donorPhone.trim()}` : null
  );

  if (donorMessage?.trim()) {
    lines.push(`- Mensaje para la familia: "${donorMessage.trim()}"`);
  }

  lines.push(
    ``,
    `Solicito amablemente me proporcionen el enlace de cobro para efectuar la transaccion.`,
    ``,
    `Atentamente,`,
    `${donorName.trim()}`
  );

  const fullMessage = lines.filter((l) => l !== null).join('\n');
  const whatsappUrl = buildUniversalWhatsAppUrl(whatsappNumber, fullMessage);

  openWhatsAppSafely(whatsappUrl);

  return {
    success: true,
    actionType: 'whatsapp_redirect',
    redirectUrl: whatsappUrl,
    referenceId,
    message: 'Redirigiendo a WhatsApp para coordinar el pago con tarjeta.',
  };
}
