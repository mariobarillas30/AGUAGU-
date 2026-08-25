import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Heart,
  Sparkles,
  Search,
  Filter,
  Share2,
  Check,
  Building2,
  Gift,
  RefreshCw,
} from 'lucide-react';
import { GiftTable, TableItem, ExtraProduct, StoreConfig } from '../../types';
import {
  getGiftTableBySlug,
  getExtraProducts,
  getStoreConfig,
  subscribeToGiftTableWithInventory,
} from '../../services/dbService';
import { GiftItemCard } from './GiftItemCard';
import { GiftActionModal } from './GiftActionModal';
import { ExtraProductsSection } from './ExtraProductsSection';
import { MesaNotFound } from './MesaNotFound';

interface PublicMesaViewProps {
  slug: string;
  onNavigateHome: () => void;
}

export const PublicMesaView: React.FC<PublicMesaViewProps> = ({
  slug,
  onNavigateHome,
}) => {
  const [table, setTable] = useState<GiftTable | null>(null);
  const [items, setItems] = useState<TableItem[]>([]);
  const [extras, setExtras] = useState<ExtraProduct[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    whatsappNumber: '50368687046',
    storeName: 'Agu Agu - Artículos de Bebé',
    currencySymbol: '$',
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Filter & Selected gift for modal
  const [selectedGiftItem, setSelectedGiftItem] = useState<TableItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'disponible' | 'regalado'>('all');
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setNotFound(false);

    // Conectar oyente en tiempo real de Firestore para Mesa + Items + Inventario
    const unsubscribe = subscribeToGiftTableWithInventory(slug, (data) => {
      setTable(data.table);
      setItems(data.items);
      setExtras(data.extras);
      setStoreConfig(data.storeConfig);
      setNotFound(data.notFound);
      setLoading(data.loading);
    });

    return () => {
      unsubscribe();
    };
  }, [slug]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center">
        <div className="w-12 h-12 border-4 border-[#A8D8EA] border-t-[#F7C8D0] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#8C90A4] font-semibold">
          Buscando la mesa de regalos con amor...
        </p>
      </div>
    );
  }

  if (notFound || !table) {
    return (
      <MesaNotFound
        slug={slug}
        onGoBack={onNavigateHome}
      />
    );
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    if (statusFilter === 'disponible') return item.status === 'disponible';
    if (statusFilter === 'regalado') return item.status !== 'disponible';
    return true;
  });

  const totalGifts = items.length;
  const completedGifts = items.filter(
    (i) => i.status === 'reservado_en_tienda' || i.status === 'seleccionado' || i.status === 'pagado'
  ).length;
  const progressPercent = totalGifts > 0 ? Math.min(100, Math.round((completedGifts / totalGifts) * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Banner with Soft Baby Pastel Aesthetic */}
      <div className="relative bg-gradient-to-br from-[#FAF7F2] via-[#FFF5F6] to-[#F2FAFD] rounded-3xl p-6 sm:p-10 border border-[#F2EAE0] shadow-sm mb-10 overflow-hidden text-center">
        
        {/* Subtle decorative background circles */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#A8D8EA]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#F7C8D0]/30 rounded-full blur-2xl pointer-events-none" />

        {/* Baby badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#F7C8D0] text-[#E58C8A] text-xs font-extrabold shadow-2xs mb-4">
          <Heart className="w-3.5 h-3.5 fill-[#F7C8D0]" />
          <span>{table.babyName ? `Bienvenido(a) Baby ${table.babyName}` : 'Mesa de Regalos para Bebé'}</span>
        </div>

        {/* Family Name */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-[#4A4E69] tracking-tight mb-3">
          {table.familyName}
        </h1>

        {/* Event Date */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#8C90A4] mb-4">
          <Calendar className="w-4 h-4 text-[#E6B875]" />
          <span>Fecha del Evento: {table.eventDate}</span>
        </div>

        {/* Greeting Message */}
        {table.greeting && (
          <p className="text-xs sm:text-sm text-[#6C7086] max-w-2xl mx-auto leading-relaxed italic bg-white/60 backdrop-blur-2xs p-4 rounded-2xl border border-[#F2EAE0]/80 mb-6">
            "{table.greeting}"
          </p>
        )}

        {/* Progress Bar & Share Button */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs font-bold text-[#6C7086] mb-1.5">
            <span>Regalos seleccionados:</span>
            <span className="text-[#E58C8A]">
              {completedGifts} de {totalGifts} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-[#E8DFC8]/60 p-0.5 mb-5 shadow-2xs">
            <div
              className="h-full bg-gradient-to-r from-[#A8D8EA] to-[#F7C8D0] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              id="btn-share-mesa"
              onClick={handleShare}
              className="px-4 py-2 rounded-xl bg-white border border-[#E2D9CF] text-xs font-bold text-[#4A4E69] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-[#4EBA88]" /> : <Share2 className="w-3.5 h-3.5 text-[#A8D8EA]" />}
              {copiedShare ? '¡Enlace Copiado!' : 'Compartir Mesa'}
            </button>
            <div
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E2D9CF] text-[#227C52] text-[11px] font-bold flex items-center gap-1.5 shadow-2xs"
              title="Sincronización en tiempo real activa"
            >
              <span className="w-2 h-2 rounded-full bg-[#4EBA88] animate-pulse" />
              <span>En vivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-heading font-bold text-2xl text-[#4A4E69]">
            Lista de Regalos Deseados
          </h2>
          <p className="text-xs text-[#8C90A4]">
            Elige el detalle que quieras obsequiar con amor a la familia
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-2xl border border-[#E8DFC8]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-[#4A4E69] shadow-2xs'
                : 'text-[#8C90A4] hover:text-[#4A4E69]'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setStatusFilter('disponible')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'disponible'
                ? 'bg-white text-[#227C52] shadow-2xs'
                : 'text-[#8C90A4] hover:text-[#4A4E69]'
            }`}
          >
            Disponibles ({items.filter((i) => i.status === 'disponible').length})
          </button>
          <button
            onClick={() => setStatusFilter('regalado')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'regalado'
                ? 'bg-white text-[#E58C8A] shadow-2xs'
                : 'text-[#8C90A4] hover:text-[#4A4E69]'
            }`}
          >
            Ya Seleccionados ({completedGifts})
          </button>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#E2D9CF] p-8">
          <Gift className="w-12 h-12 text-[#A0A4B8] mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-bold text-[#4A4E69] mb-1">
            No hay productos con este filtro
          </h3>
          <p className="text-xs text-[#8C90A4]">
            Prueba seleccionando "Todos" para ver el catálogo completo de la mesa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredItems.map((item) => (
            <GiftItemCard
              key={item.id}
              item={item}
              currencySymbol={storeConfig.currencySymbol}
              onSelectGift={(selected) => setSelectedGiftItem(selected)}
            />
          ))}
        </div>
      )}

      {/* Fixed Section of Extra Products (Cross-selling) */}
      <ExtraProductsSection
        extras={extras}
        storeConfig={storeConfig}
        tableName={table.familyName}
      />

      {/* Gift Action Modal (Pagar en tienda vs Pagar con tarjeta) */}
      <GiftActionModal
        isOpen={!!selectedGiftItem}
        onClose={() => setSelectedGiftItem(null)}
        item={selectedGiftItem}
        table={table}
        storeConfig={storeConfig}
        onSuccess={() => {
          // El listener en tiempo real de Firestore actualiza automáticamente la vista
          setSelectedGiftItem(null);
        }}
      />
    </div>
  );
};
