import React, { useState } from 'react';
import {
  Heart,
  Building2,
  CreditCard,
  Sparkles,
  UserCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { TableItem, ItemStatus } from '../../types';

interface GiftItemCardProps {
  item: TableItem;
  currencySymbol?: string;
  onSelectGift: (item: TableItem) => void;
}

export const GiftItemCard: React.FC<GiftItemCardProps> = ({
  item,
  currencySymbol = '$',
  onSelectGift,
}) => {
  const isOutOfStock = Boolean(item.isOutOfStock);
  const isAvailable = item.status === 'disponible' && !isOutOfStock;
  
  // Gallery images handling
  const allImages = item.images && item.images.length > 0 ? item.images : [item.imageUrl];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const renderStatusBadge = (status: ItemStatus) => {
    if (status === 'disponible' && isOutOfStock) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] shadow-2xs animate-in fade-in duration-200">
          <AlertCircle className="w-3 h-3 text-[#DC2626]" />
          Agotado en Tienda
        </span>
      );
    }

    switch (status) {
      case 'disponible':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F8F0] text-[#227C52] border border-[#BDE8D3] shadow-2xs">
            <Sparkles className="w-3 h-3 text-[#227C52]" />
            Disponible
          </span>
        );
      case 'reservado_en_tienda':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7E6] text-[#B76E00] border border-[#FFE0A3] shadow-2xs">
            <Building2 className="w-3 h-3 text-[#B76E00]" />
            Reservado en Tienda
          </span>
        );
      case 'seleccionado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] shadow-2xs">
            <CreditCard className="w-3 h-3 text-[#2563EB]" />
            Seleccionado con Tarjeta
          </span>
        );
      case 'pagado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDF2F8] text-[#DB2777] border border-[#FBCFE8] shadow-2xs">
            <UserCheck className="w-3 h-3 text-[#DB2777]" />
            ¡Ya Regalado! ❤️
          </span>
        );
      case 'dado_de_baja':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] shadow-2xs">
            <Ban className="w-3 h-3 text-[#6B7280]" />
            No Disponible
          </span>
        );
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between group ${
        isAvailable
          ? 'border-[#F2EAE0] hover:border-[#A8D8EA] shadow-xs hover:shadow-md'
          : isOutOfStock
          ? 'border-[#FECACA]/60 bg-[#FFFDFD] opacity-90'
          : 'border-[#EAE3D9] bg-[#FAFAF8] opacity-90'
      }`}
    >
      <div>
        {/* Product Image with Multi-View Gallery Carousel */}
        <div className="relative aspect-square rounded-2xl overflow-hidden mb-3.5 border border-[#F2EAE0] bg-[#FAF7F2]">
          <img
            src={allImages[currentImageIndex] || item.imageUrl}
            alt={`${item.name} - Vista ${currentImageIndex + 1}`}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isAvailable ? 'group-hover:scale-105' : 'grayscale-[25%]'
            }`}
          />

          {/* Status Badge */}
          <div className="absolute top-2.5 left-2.5 z-10">
            {renderStatusBadge(item.status)}
          </div>

          {/* Multi-image photo count badge */}
          {allImages.length > 1 && (
            <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white font-bold flex items-center gap-1">
              <Layers className="w-2.5 h-2.5 text-[#A8D8EA]" />
              {currentImageIndex + 1}/{allImages.length} vistas
            </div>
          )}

          {/* Carousel Arrows */}
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-md text-[#4A4E69] hover:bg-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                title="Vista anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-md text-[#4A4E69] hover:bg-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                title="Siguiente vista"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Dots navigation */}
              <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1 z-10">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentImageIndex === idx
                        ? 'w-4 bg-[#E58C8A]'
                        : 'w-1.5 bg-white/80 hover:bg-white'
                    }`}
                    title={`Ver foto ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Title & Description */}
        <h3
          className={`font-heading font-bold text-base text-[#4A4E69] mb-1 line-clamp-2 leading-snug ${
            item.status === 'dado_de_baja' ? 'line-through text-[#8C90A4]' : ''
          }`}
        >
          {item.name}
        </h3>

        <p className="text-xs text-[#8C90A4] line-clamp-2 mb-4 leading-relaxed">
          {item.description || 'Detalle especial seleccionado para la llegada del bebé.'}
        </p>

        {/* Donor display if reserved/selected */}
        {item.donorName && item.status !== 'disponible' && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8]/60 text-[11px] font-semibold text-[#6C7086] flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-[#F7C8D0] fill-[#F7C8D0]" />
            <span>Obsequiado por: <strong>{item.donorName}</strong></span>
          </div>
        )}
      </div>

      {/* Footer / CTA */}
      <div>
        <div className="flex items-center justify-between pt-3 border-t border-[#F2EAE0] mb-3">
          <span className="text-xs text-[#8C90A4] font-medium">Valor del regalo</span>
          <span className="text-lg font-extrabold text-[#E58C8A]">
            {currencySymbol}
            {item.price.toFixed(2)}
          </span>
        </div>

        {isAvailable ? (
          <button
            id={`btn-gift-item-${item.id}`}
            onClick={() => onSelectGift(item)}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#E58C8A] to-[#F48B7A] text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Heart className="w-4 h-4 fill-white" />
            Regalar este Detalle
          </button>
        ) : isOutOfStock && item.status === 'disponible' ? (
          <button
            id={`btn-gift-item-${item.id}`}
            disabled
            className="w-full py-2.5 px-4 rounded-2xl bg-[#FEF2F2] text-[#DC2626] font-bold text-xs border border-[#FECACA] flex items-center justify-center gap-2 cursor-not-allowed opacity-90 shadow-2xs"
          >
            <AlertCircle className="w-4 h-4 text-[#DC2626]" />
            Agotado en Tienda
          </button>
        ) : (
          <div className="w-full py-2 px-3 rounded-2xl bg-[#F3ECE4]/80 text-[#8C90A4] text-center text-xs font-bold border border-[#E8DFC8]/50">
            {item.status === 'reservado_en_tienda' && 'Reservado para pagar en tienda'}
            {item.status === 'seleccionado' && 'Seleccionado con tarjeta'}
            {item.status === 'pagado' && '¡Regalo completado! ❤️'}
            {item.status === 'dado_de_baja' && 'Producto no disponible'}
          </div>
        )}
      </div>
    </div>
  );
};
