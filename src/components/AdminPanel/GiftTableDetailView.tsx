import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Gift,
  ExternalLink,
  Copy,
  Check,
  Ban,
  UserCheck,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  Phone,
  User,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { GiftTable, TableItem, Product, ItemStatus } from '../../types';
import {
  markItemAsDropped,
  updateTableItemStatus,
  addItemsToGiftTable,
  subscribeToGiftTableDetail,
} from '../../services/dbService';
import { getCanonicalMesaUrl } from '../../utils/slug';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface GiftTableDetailViewProps {
  table: GiftTable;
  items: TableItem[];
  inventory: Product[];
  onBack: () => void;
  onRefresh: () => void;
  currencySymbol?: string;
}

export const GiftTableDetailView: React.FC<GiftTableDetailViewProps> = ({
  table: initialTable,
  items: initialItems,
  inventory: initialInventory,
  onBack,
  onRefresh,
  currencySymbol = '$',
}) => {
  const [currentTable, setCurrentTable] = useState<GiftTable>(initialTable);
  const [currentItems, setCurrentItems] = useState<TableItem[]>(initialItems);
  const [currentInventory, setCurrentInventory] = useState<Product[]>(initialInventory);

  const [copied, setCopied] = useState(false);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dropDialog, setDropDialog] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    isLoading: boolean;
  } | null>(null);

  // Sincronización en tiempo real del detalle de la mesa
  useEffect(() => {
    setCurrentTable(initialTable);
    setCurrentItems(initialItems);
    setCurrentInventory(initialInventory);

    const unsubscribe = subscribeToGiftTableDetail(initialTable.id, (liveData) => {
      if (liveData.table) {
        setCurrentTable(liveData.table);
      }
      setCurrentItems(liveData.items);
      setCurrentInventory(liveData.inventory);
    });

    return () => {
      unsubscribe();
    };
  }, [initialTable.id]);

  const copyPublicLink = () => {
    const fullUrl = getCanonicalMesaUrl(currentTable.slug);
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDropItem = (itemId: string, itemName: string) => {
    setDropDialog({
      isOpen: true,
      itemId,
      itemName,
      isLoading: false,
    });
  };

  const handleConfirmDrop = async () => {
    if (!dropDialog) return;
    setDropDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
    try {
      await markItemAsDropped(currentTable.id, dropDialog.itemId);
      onRefresh();
      setDropDialog(null);
    } catch (err) {
      console.error('Error al dar de baja:', err);
      setDropDialog((prev) => (prev ? { ...prev, isLoading: false } : null));
    }
  };

  const handleChangeStatus = async (itemId: string, newStatus: ItemStatus) => {
    try {
      await updateTableItemStatus(currentTable.id, itemId, newStatus);
      onRefresh();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const handleAddMoreProducts = async () => {
    if (selectedProductIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const prodsToAdd = currentInventory.filter((p) => selectedProductIds.includes(p.id));
      await addItemsToGiftTable(currentTable.id, prodsToAdd);
      setSelectedProductIds([]);
      setIsAddingMore(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const total = currentItems.length;
  const disponibles = currentItems.filter((i) => i.status === 'disponible').length;
  const reservados = currentItems.filter((i) => i.status === 'reservado_en_tienda').length;
  const seleccionados = currentItems.filter((i) => i.status === 'seleccionado').length;
  const pagados = currentItems.filter((i) => i.status === 'pagado').length;
  const dadosDeBaja = currentItems.filter((i) => i.status === 'dado_de_baja').length;

  const filteredItems = currentItems.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  // Get status badge UI
  const renderStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'disponible':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8F8F0] text-[#227C52] border border-[#BDE8D3]">
            <Sparkles className="w-3 h-3 text-[#227C52]" />
            Disponible
          </span>
        );
      case 'reservado_en_tienda':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF7E6] text-[#B76E00] border border-[#FFE0A3]">
            <Building2 className="w-3 h-3 text-[#B76E00]" />
            Reservado en Tienda
          </span>
        );
      case 'seleccionado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <CreditCard className="w-3 h-3 text-[#2563EB]" />
            Seleccionado (Tarjeta)
          </span>
        );
      case 'pagado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FDF2F8] text-[#DB2777] border border-[#FBCFE8]">
            <UserCheck className="w-3 h-3 text-[#DB2777]" />
            ¡Ya Pagado!
          </span>
        );
      case 'dado_de_baja':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] line-through">
            <Ban className="w-3 h-3 text-[#6B7280]" />
            Dado de Baja
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          id="btn-back-to-tables"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6C7086] hover:text-[#4A4E69] bg-white px-3.5 py-2 rounded-xl border border-[#E2D9CF] shadow-2xs transition-colors self-start cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Lista de Mesas
        </button>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-table"
            onClick={onRefresh}
            className="p-2 bg-white text-[#6C7086] hover:text-[#4A4E69] rounded-xl border border-[#E2D9CF] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
          <a
            href={`#mesa/${currentTable.slug}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-white text-[#4A4E69] hover:bg-[#FAF7F2] rounded-xl border border-[#E2D9CF] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#A8D8EA]" />
            Ver Vista Pública
          </a>
        </div>
      </div>

      {/* Hero Table Info Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#F2EAE0] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F7C8D0]/30 text-[#B85D6C]">
                {currentTable.babyName ? `Baby ${currentTable.babyName}` : 'Mesa de Regalo'}
              </span>
              <span className="text-xs text-[#8C90A4] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#E6B875]" />
                Fecha: {currentTable.eventDate}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#4A4E69]">
              {currentTable.familyName}
            </h2>

            {currentTable.greeting && (
              <p className="text-xs text-[#7C8097] mt-1.5 max-w-2xl italic">
                "{currentTable.greeting}"
              </p>
            )}
          </div>

          {/* Public Link Pill */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFC8]/60 lg:min-w-80">
            <span className="block text-[10px] uppercase font-bold text-[#8C90A4] tracking-wider mb-1">
              Enlace Público para Invitados
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#4A4E69] bg-white px-3 py-1.5 rounded-xl border border-[#E2D9CF] flex-1 truncate">
                #mesa/{currentTable.slug}
              </span>
              <button
                id="btn-copy-table-link"
                onClick={copyPublicLink}
                className="px-3 py-1.5 rounded-xl bg-[#E58C8A] text-white text-xs font-bold hover:brightness-105 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-[#F2EAE0]">
          <div className="bg-[#FAF7F2] p-3 rounded-2xl text-center">
            <span className="block text-xl font-bold text-[#4A4E69]">{total}</span>
            <span className="text-[11px] font-semibold text-[#8C90A4]">Total Regalos</span>
          </div>
          <div className="bg-[#E8F8F0] p-3 rounded-2xl text-center">
            <span className="block text-xl font-bold text-[#227C52]">{disponibles}</span>
            <span className="text-[11px] font-semibold text-[#227C52]">Disponibles</span>
          </div>
          <div className="bg-[#FFF7E6] p-3 rounded-2xl text-center">
            <span className="block text-xl font-bold text-[#B76E00]">{reservados}</span>
            <span className="text-[11px] font-semibold text-[#B76E00]">En Tienda</span>
          </div>
          <div className="bg-[#EFF6FF] p-3 rounded-2xl text-center">
            <span className="block text-xl font-bold text-[#2563EB]">{seleccionados}</span>
            <span className="text-[11px] font-semibold text-[#2563EB]">Con Tarjeta</span>
          </div>
          <div className="bg-[#FDF2F8] p-3 rounded-2xl text-center">
            <span className="block text-xl font-bold text-[#DB2777]">{pagados}</span>
            <span className="text-[11px] font-semibold text-[#DB2777]">Pagados</span>
          </div>
          <div className="bg-[#F3F4F6] p-3 rounded-2xl text-center">
            <span className="block text-xl font-bold text-[#6B7280]">{dadosDeBaja}</span>
            <span className="text-[11px] font-semibold text-[#6B7280]">Dados de Baja</span>
          </div>
        </div>
      </div>

      {/* Items Section Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-bold text-lg text-[#4A4E69]">
            Productos en esta Mesa ({filteredItems.length})
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E2D9CF] bg-white text-xs font-bold text-[#4A4E69] focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="disponible">Solo Disponibles</option>
            <option value="reservado_en_tienda">Solo Reservados en Tienda</option>
            <option value="seleccionado">Solo Seleccionados con Tarjeta</option>
            <option value="pagado">Solo Pagados</option>
            <option value="dado_de_baja">Solo Dados de Baja</option>
          </select>

          <button
            id="btn-add-more-prods-to-table"
            onClick={() => setIsAddingMore(!isAddingMore)}
            className="px-3.5 py-1.5 rounded-xl bg-[#4A4E69] text-white text-xs font-bold hover:bg-[#3B3E54] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAddingMore ? 'Cerrar Selector' : 'Agregar Más Productos'}
          </button>
        </div>
      </div>

      {/* Drawer / Selector to add more products to this table */}
      {isAddingMore && (
        <div className="bg-[#FAF7F2] p-5 rounded-3xl border border-[#E8DFC8] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-[#4A4E69]">
                Seleccionar productos del inventario general
              </h4>
              <p className="text-xs text-[#8C90A4]">
                Elige los productos adicionales para agregar a esta mesa
              </p>
            </div>
            <button
              id="btn-confirm-add-prods"
              disabled={selectedProductIds.length === 0 || isSubmitting}
              onClick={handleAddMoreProducts}
              className="px-4 py-2 rounded-xl bg-[#E58C8A] text-white text-xs font-bold hover:brightness-105 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Guardando...' : `Agregar (${selectedProductIds.length}) a la Mesa`}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
            {currentInventory.map((prod) => {
              const isSelected = selectedProductIds.includes(prod.id);
              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    setSelectedProductIds((prev) =>
                      isSelected ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                    );
                  }}
                  className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'border-[#E58C8A] bg-[#FFF5F6]'
                      : 'border-[#F2EAE0] bg-white hover:border-[#A8D8EA]'
                  }`}
                >
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-[#4A4E69] truncate">{prod.name}</h5>
                    <span className="text-xs font-bold text-[#E58C8A]">
                      {currencySymbol}
                      {prod.price.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                      isSelected ? 'bg-[#E58C8A] border-[#E58C8A] text-white' : 'border-[#D4CAD0]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items Table / Cards */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-[#E2D9CF]">
          <Gift className="w-10 h-10 text-[#A0A4B8] mx-auto mb-2 opacity-50" />
          <p className="text-sm text-[#8C90A4] font-semibold">
            No hay productos con este filtro en la mesa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white p-4 rounded-3xl border transition-all flex flex-col justify-between gap-3 ${
                item.status === 'dado_de_baja'
                  ? 'border-[#E5E7EB] opacity-65 bg-[#FAFAFA]'
                  : 'border-[#F2EAE0] shadow-xs'
              }`}
            >
              <div className="flex gap-3.5">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-[#F2EAE0]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4
                      className={`text-sm font-bold text-[#4A4E69] leading-snug line-clamp-2 ${
                        item.status === 'dado_de_baja' ? 'line-through text-[#8C90A4]' : ''
                      }`}
                    >
                      {item.name}
                    </h4>
                    <span className="text-sm font-extrabold text-[#E58C8A] shrink-0">
                      {currencySymbol}
                      {item.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="mb-2">{renderStatusBadge(item.status)}</div>

                  {/* Donor Info if reserved/selected */}
                  {(item.donorName || item.donorPhone) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8]/60 text-xs text-[#5C6078] space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-[#4A4E69]">
                        <User className="w-3.5 h-3.5 text-[#E6B875]" />
                        <span>Donante: {item.donorName || 'Anónimo'}</span>
                      </div>
                      {item.donorPhone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7C8097]">
                          <Phone className="w-3 h-3 text-[#A8D8EA]" />
                          <span>Tel: {item.donorPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons for this item */}
              <div className="pt-3 border-t border-[#F2EAE0] flex items-center justify-between gap-2 flex-wrap">
                {/* Manual Drop button for "disponible" status */}
                {item.status === 'disponible' && (
                  <button
                    id={`btn-drop-item-${item.id}`}
                    onClick={() => handleDropItem(item.id, item.name)}
                    className="px-3 py-1.5 rounded-xl bg-[#FFF0F0] text-[#C53030] hover:bg-[#FFE0E0] border border-[#FFD6D6] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Dar de baja este producto de la mesa"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Dar de Baja
                  </button>
                )}

                {/* State transitions for store manager */}
                {item.status === 'reservado_en_tienda' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChangeStatus(item.id, 'pagado')}
                      className="px-3 py-1.5 rounded-xl bg-[#E8F8F0] text-[#227C52] hover:bg-[#D4F4E4] border border-[#BDE8D3] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Marcar como Pagado
                    </button>
                    <button
                      onClick={() => handleChangeStatus(item.id, 'disponible')}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-[#8C90A4] hover:text-[#4A4E69] border border-[#E2D9CF] text-xs font-semibold transition-colors"
                    >
                      Liberar
                    </button>
                  </div>
                )}

                {item.status === 'seleccionado' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleChangeStatus(item.id, 'pagado')}
                      className="px-3 py-1.5 rounded-xl bg-[#E8F8F0] text-[#227C52] hover:bg-[#D4F4E4] border border-[#BDE8D3] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Confirmar Pago
                    </button>
                    <button
                      onClick={() => handleChangeStatus(item.id, 'disponible')}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-[#8C90A4] hover:text-[#4A4E69] border border-[#E2D9CF] text-xs font-semibold transition-colors"
                    >
                      Restablecer
                    </button>
                  </div>
                )}

                {item.status === 'dado_de_baja' && (
                  <button
                    onClick={() => handleChangeStatus(item.id, 'disponible')}
                    className="px-3 py-1.5 rounded-xl bg-white text-[#4A4E69] hover:bg-[#FAF7F2] border border-[#E2D9CF] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#A8D8EA]" />
                    Reactivar a Disponible
                  </button>
                )}

                {item.status === 'pagado' && (
                  <span className="text-xs font-bold text-[#4EBA88] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Completado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* In-app confirmation dialog for dropping item */}
      {dropDialog && (
        <ConfirmDialog
          isOpen={dropDialog.isOpen}
          title="Dar de Baja Producto"
          message="¿Seguro que deseas dar de baja este producto de la mesa de regalos? Los invitados ya no podrán seleccionarlo ni comprarlo."
          itemName={dropDialog.itemName}
          confirmLabel="Dar de Baja"
          variant="danger"
          isLoading={dropDialog.isLoading}
          onConfirm={handleConfirmDrop}
          onCancel={() => setDropDialog(null)}
        />
      )}
    </div>
  );
};
