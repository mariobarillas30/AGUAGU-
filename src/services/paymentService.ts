/**
 * ==============================================================================
 * MÓDULO DE PROCESAMIENTO DE PAGOS / INTENCIONES DE PAGO CON TARJETA
 * ==============================================================================
 * 
 * Este módulo centraliza la lógica cuando un invitado selecciona la opción
 * "Pagar con tarjeta" en la mesa de regalo.
 * 
 * IMPLEMENTACIÓN ACTUAL:
 * - Sanitiza los datos del donante y producto.
 * - Genera un enlace a WhatsApp (https://wa.me/...) con un mensaje pre-llenado
 *   dirigido a la tienda con los detalles del donante, nombre de la mesa y regalo.
 * - Abre el enlace en una nueva pestaña para coordinar el pago/enlace de cobro.
 * - Devuelve el resultado de la operación para que el estado del producto pase a 'seleccionado'.
 * 
 * 🚀 CÓMO REEMPLAZAR ESTO POR UNA CLOUD FUNCTION / PASARELA DE PAGO (WOMPI / STRIPE / OTRO):
 * - Para conectar Wompi u otra pasarela en el futuro, no es necesario tocar las vistas (UI).
 * - Solo modifica la función `processCardPaymentIntent` en este archivo:
 *   1. Llama a tu endpoint de Cloud Function (ej: POST /api/create-wompi-checkout)
 *   2. Obtén el checkoutUrl generado con el monto exacto y referencia única.
 *   3. Redirige al usuario a `checkoutUrl` o abre el widget de pago.
 *   4. La Cloud Function mediante webhook actualizará el estado de Firestore a 'pagado'.
 * ==============================================================================
 */

export interface CardPaymentParams {
  donorName: string;
  donorPhone?: string;
  tableName: string;
  tableSlug: string;
  productName: string;
  productPrice: number;
  currencySymbol?: string;
  whatsappNumber: string; // Número telefónico de la tienda configurado en Firestore
  storeName?: string;
  donorMessage?: string;
}

export interface StoreReservationParams {
  donorName: string;
  donorPhone: string;
  tableName: string;
  tableSlug: string;
  productName: string;
  productPrice: number;
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
 * Limpia y formatea un número de teléfono para enlaces de WhatsApp (solo dígitos).
 * Por defecto usa el número oficial configurado en El Salvador: +503 6868 7046.
 */
export function sanitizeWhatsAppNumber(rawNumber?: string): string {
  if (!rawNumber) return '50368687046';
  const digits = rawNumber.replace(/[^\d]/g, '');
  // Si quedó vacío o contiene placeholders anteriores de prueba
  if (!digits || digits === '50212345678' || digits === '50370000000' || digits === '50363031927') {
    return '50368687046';
  }
  return digits;
}

/**
 * Genera el enlace y mensaje de WhatsApp para dar seguimiento a una reserva física en tienda.
 */
export async function processStoreReservationIntent(
  params: StoreReservationParams
): Promise<PaymentIntentResult> {
  const {
    donorName,
    donorPhone,
    tableName,
    productName,
    productPrice,
    currencySymbol = '$',
    whatsappNumber,
    storeName = 'Agu Agu - Artículos de Bebé',
    donorMessage,
  } = params;

  const referenceId = `TIENDA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const cleanPhone = sanitizeWhatsAppNumber(whatsappNumber);
  const formattedPrice = `${currencySymbol}${productPrice.toFixed(2)}`;

  const lines = [
    `👶 *¡Hola ${storeName}!* He apartado un regalo en tienda de la *Mesa de Regalo*.`,
    ``,
    `📋 *Detalles de la Reserva:*`,
    `• *Mesa / Familia:* ${tableName}`,
    `• *Producto:* ${productName}`,
    `• *Valor:* ${formattedPrice}`,
    `• *Código de Reserva:* ${referenceId}`,
    ``,
    `🎁 *Datos de Quien Reserva:*`,
    `• *Nombre:* ${donorName.trim()}`,
    `• *Teléfono:* ${donorPhone.trim()}`,
    donorMessage?.trim() ? `• *Mensaje a la familia:* "${donorMessage.trim()}"` : null,
    ``,
    `🏪 *Modalidad:* Pagar y retirar en tienda física.`,
    `💬 Por favor confirmarme para pasar a pagar a la tienda. ¡Muchas gracias!`,
  ].filter(Boolean);

  const fullMessage = lines.join('\n');
  const encodedText = encodeURIComponent(fullMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  try {
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    return {
      success: true,
      actionType: 'whatsapp_redirect',
      redirectUrl: whatsappUrl,
      referenceId,
      message: 'Redirigiendo a WhatsApp para dar seguimiento a la reserva en tienda...',
    };
  } catch (error) {
    console.error('Error al abrir WhatsApp para reserva en tienda:', error);
    return {
      success: true,
      actionType: 'whatsapp_redirect',
      redirectUrl: whatsappUrl,
      referenceId,
      message: 'Reserva guardada. Puedes hacer clic en el botón de WhatsApp para notificar a la tienda.',
    };
  }
}

/**
 * Procesa la intención de pago con tarjeta del donante.
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
    currencySymbol = '$',
    whatsappNumber,
    storeName = 'Agu Agu - Artículos de Bebé',
    donorMessage,
  } = params;

  // Generamos un ID de referencia amigable para seguimiento
  const referenceId = `REG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // --------------------------------------------------------------------------
  // INTEGRACIÓN ACTUAL: Enlace a WhatsApp
  // --------------------------------------------------------------------------
  const cleanPhone = sanitizeWhatsAppNumber(whatsappNumber);
  
  const formattedPrice = `${currencySymbol}${productPrice.toFixed(2)}`;
  
  // Construcción del mensaje prellenado
  const lines = [
    `👶 *¡Hola ${storeName}!* Quisiera pagar con tarjeta un regalo de la *Mesa de Regalo*.`,
    ``,
    `📋 *Detalles del Regalo:*`,
    `• *Mesa / Familia:* ${tableName}`,
    `• *Producto:* ${productName}`,
    `• *Valor:* ${formattedPrice}`,
    `• *Referencia:* ${referenceId}`,
    ``,
    `🎁 *Mis Datos (Donante):*`,
    `• *Nombre:* ${donorName.trim()}`,
    donorPhone ? `• *Teléfono:* ${donorPhone.trim()}` : null,
    donorMessage?.trim() ? `• *Mensaje a la familia:* "${donorMessage.trim()}"` : null,
    ``,
    `💳 *Solicitud:* Por favor envíenme el enlace para realizar el pago con tarjeta. ¡Muchas gracias!`,
  ].filter(Boolean);

  const fullMessage = lines.join('\n');
  const encodedText = encodeURIComponent(fullMessage);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  try {
    // Abrir WhatsApp en una nueva pestaña
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    return {
      success: true,
      actionType: 'whatsapp_redirect',
      redirectUrl: whatsappUrl,
      referenceId,
      message: 'Redirigiendo a WhatsApp para coordinar el pago con tarjeta...',
    };
  } catch (error) {
    console.error('Error al abrir WhatsApp:', error);
    return {
      success: true, // Aún devolvemos true para que la UI muestre el link en caso de popup bloqueado
      actionType: 'whatsapp_redirect',
      redirectUrl: whatsappUrl,
      referenceId,
      message: 'Por favor haz clic en el botón de WhatsApp si no se abrió automáticamente.',
    };
  }
}

