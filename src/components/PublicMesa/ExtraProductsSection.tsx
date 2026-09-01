import React from 'react';
import { Sparkles, ShoppingBag, MessageCircle, Heart } from 'lucide-react';
import { ExtraProduct, StoreConfig } from '../../types';
import { sanitizeWhatsAppNumber } from '../../services/paymentService';

interface ExtraProductsSectionProps {
  extras: ExtraProduct[];
  storeConfig: StoreConfig;
  tableName: string;
}

export const ExtraProductsSection: React.FC<ExtraProductsSectionProps> = ({
  extras,
  storeConfig,
  tableName,
}) => {
  if (extras.length === 0) return null;

  const handleOrderExtra = (extra: ExtraProduct) => {
    const cleanPhone = sanitizeWhatsAppNumber(storeConfig.whatsappNumber);
    const msg = [
      `👶 *¡Hola ${storeConfig.storeName}!* Quisiera agregar un *Detalle Especial* para la mesa de regalos:`,
      `• *Mesa:* ${tableName}`,
      `• *Detalle Especial:* ${extra.name}`,
      `• *Valor:* ${storeConfig.currencySymbol}${extra.price.toFixed(2)}`,
      ``,
      `Por favor indíquenme cómo puedo coordinar este detalle adicional con amor. ¡Gracias!`,
    ].join('\n');

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="mt-16 pt-12 border-t-2 border-dashed border-[#E8DFC8]">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F7C8D0]/30 text-[#D64E66] border border-[#F7C8D0] text-xs font-bold mb-2.5">
          <Heart className="w-3.5 h-3.5 text-[#E58C8A] fill-[#F7C8D0]" />
          <span>Detalles Especiales</span>
        </div>
        <h3 className="text-2xl font-heading font-bold text-[#4A4E69]">
          ¿Deseas agregar un detalle extra con amor?
        </h3>
        <p className="text-xs text-[#8C90A4] max-w-lg mx-auto mt-1">
          Complementa tu obsequio con estos hermosos accesorios para el bebé o una envoltura de regalo personalizada.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {extras.map((extra) => (
          <div
            key={extra.id}
            className="bg-white rounded-3xl p-4 border border-[#F2EAE0] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 border border-[#F2EAE0] bg-[#FAF7F2]">
                <img
                  src={extra.imageUrl}
                  alt={extra.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {extra.badge && (
                  <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-xs text-[#E58C8A] border border-[#F7C8D0] shadow-2xs">
                    {extra.badge}
                  </span>
                )}
              </div>

              <h4 className="font-heading font-bold text-sm text-[#4A4E69] mb-1 line-clamp-1">
                {extra.name}
              </h4>
              <p className="text-xs text-[#8C90A4] line-clamp-2 mb-3">
                {extra.description}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between pt-2.5 border-t border-[#F2EAE0] mb-3">
                <span className="text-xs text-[#8C90A4] font-medium">Precio</span>
                <span className="text-base font-extrabold text-[#E58C8A]">
                  {storeConfig.currencySymbol}
                  {extra.price.toFixed(2)}
                </span>
              </div>

              <button
                id={`btn-order-extra-${extra.id}`}
                onClick={() => handleOrderExtra(extra)}
                className="w-full py-2 px-3 rounded-xl bg-white border border-[#E2D9CF] text-[#4A4E69] hover:bg-[#FAF7F2] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                Agregar vía WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
