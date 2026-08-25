import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Heart,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Phone,
  User,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TableItem, GiftTable, StoreConfig } from '../../types';
import { reserveTableItemWithTransaction } from '../../services/dbService';
import { processCardPaymentIntent, processStoreReservationIntent } from '../../services/paymentService';

interface GiftActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TableItem | null;
  table: GiftTable;
  storeConfig: StoreConfig;
  onSuccess: () => void;
}

export const GiftActionModal: React.FC<GiftActionModalProps> = ({
  isOpen,
  onClose,
  item,
  table,
  storeConfig,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'tienda' | 'tarjeta' | null>(null);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrlGenerated, setWhatsappUrlGenerated] = useState<string | null>(null);
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const itemImages = item.images && item.images.length > 0 ? item.images : [item.imageUrl];

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A8D8EA', '#F7C8D0', '#E6B875', '#FAF7F2', '#F48B7A'],
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  };

  // Handler for Option A: Pagar en Tienda con seguimiento por WhatsApp
  const handleConfirmPayInStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = donorName.trim();
    const cleanPhone = donorPhone.trim();

    if (!cleanName) {
      setFormError('Por favor ingresa tu nombre para registrar la reserva a tu nombre.');
      return;
    }

    if (!cleanPhone) {
      setFormError('Por favor ingresa tu número de teléfono para que la tienda pueda dar seguimiento a tu reserva.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Reservar atómicamente en Firestore
      const result = await reserveTableItemWithTransaction(table.id, item.id, 'reservado_en_tienda', {
        donorName: cleanName,
        donorPhone: cleanPhone,
        paymentMethod: 'tienda',
        notes: donorMessage.trim() || undefined,
      });

      if (!result.success) {
        setFormError(result.message || 'No fue posible completar la reserva.');
        setIsSubmitting(false);
        return;
      }

      // 2. Notificar a la tienda vía WhatsApp para seguimiento idéntico a tarjeta
      const storeIntentResult = await processStoreReservationIntent({
        donorName: cleanName,
        donorPhone: cleanPhone,
        tableName: table.familyName,
        tableSlug: table.slug,
        productName: item.name,
        productPrice: item.price,
        currencySymbol: storeConfig.currencySymbol,
        whatsappNumber: storeConfig.whatsappNumber,
        storeName: storeConfig.storeName,
        donorMessage: donorMessage.trim() || undefined,
      });

      if (storeIntentResult.redirectUrl) {
        setWhatsappUrlGenerated(storeIntentResult.redirectUrl);
      }

      triggerConfetti();
      setIsSuccess(true);
      onSuccess();
    } catch (error) {
      console.error('Error al reservar en tienda:', error);
      setFormError('Hubo un error al reservar el regalo. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Option B: Pagar con Tarjeta (WhatsApp link generation)
  const handleConfirmPayWithCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = donorName.trim();
    const cleanPhone = donorPhone.trim();

    if (!cleanName) {
      setFormError('Por favor ingresa tu nombre completo para personalizar el regalo.');
      return;
    }

    if (!cleanPhone) {
      setFormError('Por favor ingresa tu teléfono para enviarte el enlace seguro de pago.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Validar y reservar atómicamente en Firestore (prevención de race condition)
      const reserveResult = await reserveTableItemWithTransaction(table.id, item.id, 'seleccionado', {
        donorName: cleanName,
        donorPhone: cleanPhone,
        paymentMethod: 'tarjeta',
        notes: donorMessage.trim() || undefined,
      });

      if (!reserveResult.success) {
        setFormError(reserveResult.message || 'No fue posible apartar este regalo.');
        setIsSubmitting(false);
        return;
      }

      // 2. Process payment intent via the isolated paymentService module
      const paymentIntentResult = await processCardPaymentIntent({
        donorName: cleanName,
        donorPhone: cleanPhone,
        tableName: table.familyName,
        tableSlug: table.slug,
        productName: item.name,
        productPrice: item.price,
        currencySymbol: storeConfig.currencySymbol,
        whatsappNumber: storeConfig.whatsappNumber,
        storeName: storeConfig.storeName,
        donorMessage: donorMessage.trim() || undefined,
      });

      if (paymentIntentResult.redirectUrl) {
        setWhatsappUrlGenerated(paymentIntentResult.redirectUrl);
      }

      triggerConfetti();
      setIsSuccess(true);
      onSuccess();
    } catch (error) {
      console.error('Error al procesar pago con tarjeta:', error);
      setFormError('Hubo un error al coordinar el pago. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setDonorName('');
    setDonorPhone('');
    setDonorMessage('');
    setIsSuccess(false);
    setWhatsappUrlGenerated(null);
    setFormError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#F2EAE0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4">
        
        {/* ================================================================= */}
        {/* SUCCESS SCREEN */}
        {/* ================================================================= */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-18 h-18 mx-auto mb-4 bg-gradient-to-tr from-[#A8D8EA] to-[#F7C8D0] rounded-3xl p-1 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[20px] flex items-center justify-center">
                <Heart className="w-9 h-9 text-[#E58C8A] fill-[#F7C8D0]" />
              </div>
            </div>

            <h3 className="text-2xl font-heading font-bold text-[#4A4E69] mb-1">
              ¡Muchas Gracias por tu Cariño! 🍼
            </h3>
            
            <p className="text-xs text-[#8C90A4] max-w-sm mx-auto mb-5">
              Has apartado este regalo para la <strong className="text-[#4A4E69]">{table.familyName}</strong>.
            </p>

            {/* Success details based on chosen method */}
            {selectedMethod === 'tienda' ? (
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFC8]/60 text-left space-y-3 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B76E00]">
                  <Building2 className="w-4 h-4" />
                  <span>Reserva en Tienda Registrada</span>
                </div>
                <p className="text-xs text-[#6C7086]">
                  El producto ha quedado reservado a nombre de{' '}
                  <strong className="text-[#4A4E69]">{donorName}</strong> (Tel: {donorPhone}). Se ha generado el mensaje de WhatsApp para que la tienda le dé seguimiento a tu visita.
                </p>
                <div className="text-xs font-semibold text-[#4A4E69] bg-white p-2.5 rounded-xl border border-[#E2D9CF]">
                  📍 {storeConfig.storeName} - {storeConfig.storeAddress || 'Tienda Principal'}
                </div>

                {whatsappUrlGenerated && (
                  <div className="pt-2">
                    <a
                      href={whatsappUrlGenerated}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:brightness-105 transition-all shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Notificar a la Tienda por WhatsApp (+503 6868 7046)
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFC8]/60 text-left space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                  <CreditCard className="w-4 h-4" />
                  <span>Regalo Seleccionado para Pago con Tarjeta</span>
                </div>
                <p className="text-xs text-[#6C7086]">
                  Se abrió WhatsApp con el número de la tienda para facilitarte el enlace seguro de cobro. Si no se abrió automáticamente, presiona el botón:
                </p>
                {whatsappUrlGenerated && (
                  <a
                    href={whatsappUrlGenerated}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:brightness-105 transition-all shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Abrir Chat de WhatsApp (+503 6868 7046)
                  </a>
                )}
              </div>
            )}

            <button
              id="btn-close-gift-success"
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-[#4A4E69] text-white font-bold text-xs hover:bg-[#3B3E54] transition-colors cursor-pointer"
            >
              Volver a la Mesa de Regalos
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 bg-[#FAF7F2] border-b border-[#F2EAE0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#A8D8EA] to-[#F7C8D0] p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-[#E58C8A]">
                    <Heart className="w-5 h-5 fill-[#F7C8D0]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#4A4E69]">
                    Obsequiar este Regalo
                  </h3>
                  <p className="text-xs text-[#8C90A4]">
                    Para la {table.familyName}
                  </p>
                </div>
              </div>

              <button
                id="btn-close-gift-action-modal"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFC8] text-[#8C90A4] hover:text-[#4A4E69] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product preview banner */}
              <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#F2EAE0]">
                <div className="flex items-center gap-3.5">
                  <img
                    src={itemImages[modalImageIdx] || item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-[#E2D9CF] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-[#4A4E69] truncate">
                      {item.name}
                    </h4>
                    <span className="text-sm font-extrabold text-[#E58C8A]">
                      {storeConfig.currencySymbol}
                      {item.price.toFixed(2)}
                    </span>
                    <p className="text-[11px] text-[#8C90A4] line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                {itemImages.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-[#E8DFC8]/60 flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-bold text-[#8C90A4] uppercase mr-1">Vistas/Colores:</span>
                    {itemImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setModalImageIdx(idx)}
                        className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                          modalImageIdx === idx
                            ? 'border-[#E58C8A] ring-1 ring-[#F7C8D0]'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 1: Select Option if none chosen */}
              {!selectedMethod ? (
                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#8C90A4]">
                    ¿Cómo deseas realizar tu regalo?
                  </span>

                  {/* Option A Card */}
                  <div
                    id="btn-select-pay-in-store"
                    onClick={() => setSelectedMethod('tienda')}
                    className="p-4 rounded-2xl border-2 border-[#F2EAE0] hover:border-[#E6B875] bg-white hover:bg-[#FFFDF7] transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF7E6] text-[#B76E00] flex items-center justify-center shrink-0 border border-[#FFE0A3] group-hover:scale-105 transition-transform">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-sm text-[#4A4E69]">
                            1. Pagar y Reservar en Tienda
                          </h5>
                          <ArrowRight className="w-4 h-4 text-[#A0A4B8] group-hover:text-[#B76E00] transition-colors" />
                        </div>
                        <p className="text-xs text-[#8C90A4] mt-0.5">
                          Aparta el regalo con tus datos y notifica por WhatsApp para coordinar tu visita y pago en tienda.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option B Card */}
                  <div
                    id="btn-select-pay-with-card"
                    onClick={() => setSelectedMethod('tarjeta')}
                    className="p-4 rounded-2xl border-2 border-[#F2EAE0] hover:border-[#A8D8EA] bg-white hover:bg-[#F7FAFD] transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#BFDBFE] group-hover:scale-105 transition-transform">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-sm text-[#4A4E69]">
                            2. Pagar con Tarjeta (Enlace / WhatsApp)
                          </h5>
                          <ArrowRight className="w-4 h-4 text-[#A0A4B8] group-hover:text-[#2563EB] transition-colors" />
                        </div>
                        <p className="text-xs text-[#8C90A4] mt-0.5">
                          Coordina el enlace de pago seguro con tarjeta directamente con la tienda por WhatsApp.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedMethod === 'tienda' ? (
                /* ========================================================= */
                /* FORM OPTION A: PAGAR EN TIENDA                            */
                /* ========================================================= */
                <form onSubmit={handleConfirmPayInStore} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F2EAE0]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#B76E00]">
                      <Building2 className="w-4 h-4" />
                      <span>Opción 1: Pagar y Reservar en Tienda</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="text-xs font-bold text-[#E58C8A] hover:underline cursor-pointer"
                    >
                      Cambiar opción
                    </button>
                  </div>

                  <div className="p-3 bg-[#FFF9E6] rounded-xl border border-[#FFE0A3] text-xs text-[#B76E00]">
                    🏪 Ingresa tus datos para registrar la reserva a tu nombre. Al confirmar, se notificará a la tienda por WhatsApp (+503 6868 7046) para coordinar tu visita.
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Tu Nombre Completo * (Obligatorio)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#A0A4B8] absolute left-3 top-2.5" />
                      <input
                        id="input-store-donor-name"
                        type="text"
                        required
                        placeholder="Ej: Sofía Morales o Tía Carmen"
                        value={donorName}
                        onChange={(e) => {
                          setDonorName(e.target.value);
                          setFormError(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Teléfono de Contacto * (Obligatorio para seguimiento)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#A0A4B8] absolute left-3 top-2.5" />
                      <input
                        id="input-store-donor-phone"
                        type="tel"
                        required
                        placeholder="Ej: 6868-7046 o +503 6868 7046"
                        value={donorPhone}
                        onChange={(e) => {
                          setDonorPhone(e.target.value);
                          setFormError(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Mensaje / Dedicatoria para la Familia (Opcional)
                    </label>
                    <input
                      id="input-store-donor-msg"
                      type="text"
                      placeholder="¡Felicidades por la llegada del bebé!"
                      value={donorMessage}
                      onChange={(e) => setDonorMessage(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#F2EAE0] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#8C90A4] hover:text-[#4A4E69] cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      id="btn-confirm-reserve-store"
                      type="submit"
                      disabled={isSubmitting || !donorName.trim() || !donorPhone.trim()}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#E58C8A] to-[#F48B7A] text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isSubmitting ? 'Registrando...' : 'Confirmar y Notificar a Tienda'}
                    </button>
                  </div>
                </form>
              ) : (
                /* ========================================================= */
                /* FORM OPTION B: PAGAR CON TARJETA (MÓDULO WHATSAPP)        */
                /* ========================================================= */
                <form onSubmit={handleConfirmPayWithCard} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F2EAE0]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                      <CreditCard className="w-4 h-4" />
                      <span>Opción 2: Pagar con Tarjeta</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="text-xs font-bold text-[#E58C8A] hover:underline cursor-pointer"
                    >
                      Cambiar opción
                    </button>
                  </div>

                  <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] text-xs text-[#1E40AF]">
                    💬 Al confirmar, abriremos un chat de WhatsApp con la tienda (+503 6868 7046) pre-llenado con los datos del regalo para facilitarte el link de pago seguro.
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Tu Nombre Completo * (Obligatorio)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#A0A4B8] absolute left-3 top-2.5" />
                      <input
                        id="input-card-donor-name"
                        type="text"
                        required
                        placeholder="Ej: Laura Méndez"
                        value={donorName}
                        onChange={(e) => {
                          setDonorName(e.target.value);
                          setFormError(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Tu Teléfono * (Obligatorio para enviarte el enlace)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#A0A4B8] absolute left-3 top-2.5" />
                      <input
                        id="input-card-donor-phone"
                        type="tel"
                        required
                        placeholder="Ej: 6868-7046 o +503 6868 7046"
                        value={donorPhone}
                        onChange={(e) => {
                          setDonorPhone(e.target.value);
                          setFormError(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Mensaje de Dedicatoria (Opcional)
                    </label>
                    <input
                      id="input-card-donor-msg"
                      type="text"
                      placeholder="Con mucho cariño para el bebé..."
                      value={donorMessage}
                      onChange={(e) => setDonorMessage(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#F2EAE0] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#8C90A4] hover:text-[#4A4E69] cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      id="btn-confirm-pay-card"
                      type="submit"
                      disabled={isSubmitting || !donorName.trim() || !donorPhone.trim()}
                      className="px-5 py-2 rounded-xl bg-[#25D366] text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isSubmitting ? 'Generando Enlace...' : 'Continuar a WhatsApp (+503 6868 7046)'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
