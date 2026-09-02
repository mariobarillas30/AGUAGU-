import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Gift,
  Check,
  Search,
  Calendar,
  Heart,
  Copy,
  ExternalLink,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { Product } from '../../types';
import { createGiftTable, getProducts, seedInitialSampleDataIfEmpty } from '../../services/dbService';
import { getCanonicalMesaUrl } from '../../utils/slug';

interface CreateGiftTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory?: Product[];
  onTableCreated?: (slug?: string) => void;
  currencySymbol?: string;
}

export const CreateGiftTableModal: React.FC<CreateGiftTableModalProps> = ({
  isOpen,
  onClose,
  inventory: initialInventory,
  onTableCreated,
  currencySymbol = '$',
}) => {
  const [familyName, setFamilyName] = useState('');
  const [babyName, setBabyName] = useState('');
  const [eventDate, setEventDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [greeting, setGreeting] = useState(
    '¡Estamos muy felices de compartir la llegada de nuestro bebé con ustedes! Gracias por sus muestras de cariño.'
  );
  const [availableProducts, setAvailableProducts] = useState<Product[]>(initialInventory || []);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load products if initial inventory is not provided or empty
  useEffect(() => {
    if (isOpen) {
      if (initialInventory && initialInventory.length > 0) {
        setAvailableProducts(initialInventory);
      } else {
        setIsLoadingInventory(true);
        getProducts()
          .then((prods) => {
            if (prods.length === 0) {
              return seedInitialSampleDataIfEmpty().then(() => getProducts());
            }
            return prods;
          })
          .then((loaded) => {
            setAvailableProducts(loaded);
          })
          .catch((err) => {
            console.error('Error cargando inventario en modal:', err);
          })
          .finally(() => {
            setIsLoadingInventory(false);
          });
      }
    }
  }, [isOpen, initialInventory]);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(availableProducts.map((p) => p.category || 'General')))];

  const filteredInventory = availableProducts.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  const toggleProduct = (productId: string) => {
    setFormError(null);
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const selectAllFiltered = () => {
    setFormError(null);
    const currentFilteredIds = filteredInventory.map((p) => p.id);
    const allSelected = currentFilteredIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const selectTopEssentials = () => {
    setFormError(null);
    // Select first 6 products as recommended baby essentials
    const topIds = availableProducts.slice(0, 6).map((p) => p.id);
    setSelectedProductIds(topIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanFamilyName = familyName.trim();
    if (!cleanFamilyName) {
      setFormError('Por favor ingresa el nombre de la familia o evento (Ej: Familia Morales o Baby Shower Sofía).');
      return;
    }

    if (!eventDate) {
      setFormError('Por favor selecciona la fecha del evento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProducts = availableProducts.filter((p) => selectedProductIds.includes(p.id));
      const { slug } = await createGiftTable(
        {
          familyName: cleanFamilyName,
          babyName: babyName.trim() || undefined,
          eventDate,
          greeting: greeting.trim(),
        },
        selectedProducts
      );

      setCreatedSlug(slug);
      onTableCreated?.(slug);
    } catch (err: any) {
      console.error('Error al crear mesa de regalos:', err);
      setFormError(
        err?.message || 'Ocurrió un error al guardar la mesa en la base de datos. Por favor verifica tu conexión e intenta de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPublicLink = () => {
    if (!createdSlug) return;
    const fullUrl = getCanonicalMesaUrl(createdSlug);
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFinish = () => {
    const slugToOpen = createdSlug;
    // Reset state
    setFamilyName('');
    setBabyName('');
    setSelectedProductIds([]);
    setCreatedSlug(null);
    setFormError(null);
    onClose();
    if (slugToOpen && typeof window !== 'undefined') {
      window.location.hash = `#mesa/${slugToOpen}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-[#F2EAE0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4 max-h-[92vh] flex flex-col">
        
        {/* If successfully created, show celebratory link dialog */}
        {createdSlug ? (
          <div className="p-8 text-center overflow-y-auto">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-tr from-[#A8D8EA] to-[#F7C8D0] rounded-3xl p-1 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[20px] flex items-center justify-center text-[#E58C8A]">
                <CheckCircle2 className="w-10 h-10 text-[#4EBA88]" />
              </div>
            </div>

            <h3 className="text-2xl font-heading font-bold text-[#4A4E69] mb-1">
              ¡Mesa de Regalos Creada con Éxito!
            </h3>
            <p className="text-sm text-[#8C90A4] max-w-md mx-auto mb-6">
              Tu mesa de regalos ya está activa en la tienda oficial <strong>Agu Agu</strong>. Comparte este enlace con familiares y amigos.
            </p>

            {/* Generated Link Box */}
            <div className="max-w-lg mx-auto bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFC8] mb-6 text-left">
              <span className="block text-[11px] font-bold uppercase text-[#8C90A4] tracking-wider mb-1.5">
                Enlace Público de la Mesa:
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white px-3.5 py-2.5 rounded-xl border border-[#E2D9CF] text-xs font-mono font-bold text-[#4A4E69] truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/#mesa/${createdSlug}` : `/mesa/${createdSlug}`}
                </div>
                <button
                  id="btn-copy-public-link"
                  type="button"
                  onClick={copyPublicLink}
                  className="px-4 py-2.5 rounded-xl bg-[#E58C8A] text-white text-xs font-bold hover:brightness-105 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-[11px] text-[#8C90A4] mt-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#E6B875]" />
                Código slug único: <span className="font-mono font-bold text-[#4A4E69]">{createdSlug}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-go-to-public-mesa"
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#FF8B8B] text-white font-bold text-xs shadow-md shadow-pink-200/50 hover:bg-[#ff7a7a] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                Ver mi Mesa de Regalos
              </button>
              <button
                id="btn-finish-table-creation"
                type="button"
                onClick={() => {
                  setCreatedSlug(null);
                  onClose();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white border border-[#E2D9CF] text-[#4A4E69] font-bold text-xs hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 bg-[#FAF7F2] border-b border-[#F2EAE0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#A8D8EA] to-[#F7C8D0] p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-[#E58C8A]">
                    <Gift className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-[#4A4E69]">
                    Crear Mesa de Regalos
                  </h3>
                  <p className="text-xs text-[#8C90A4]">
                    Registra la información del bebé y elige los artículos favoritos de la tienda
                  </p>
                </div>
              </div>
              <button
                id="close-create-table-btn"
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFC8] text-[#8C90A4] hover:text-[#4A4E69] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Family Details */}
              <div className="bg-[#FAF7F2]/60 p-4 rounded-2xl border border-[#F2EAE0] space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C90A4] flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-[#F7C8D0]" />
                  Información del Evento y Familia
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Nombre de la Familia o Evento *
                    </label>
                    <input
                      id="family-name-input"
                      type="text"
                      required
                      placeholder="Ej: Familia Morales Castro o Baby Shower Sofía"
                      value={familyName}
                      onChange={(e) => {
                        setFamilyName(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D9CF] bg-white text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Nombre del Bebé (Opcional)
                    </label>
                    <input
                      id="baby-name-input"
                      type="text"
                      placeholder="Ej: Sofía o Mateo"
                      value={babyName}
                      onChange={(e) => setBabyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D9CF] bg-white text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Fecha del Evento *
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#A0A4B8] absolute left-3 top-3" />
                      <input
                        id="event-date-input"
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E2D9CF] bg-white text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#6C7086] mb-1">
                      Mensaje de Bienvenida para Invitados
                    </label>
                    <input
                      id="table-greeting-input"
                      type="text"
                      placeholder="Mensaje amoroso para tus seres queridos..."
                      value={greeting}
                      onChange={(e) => setGreeting(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D9CF] bg-white text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection from Inventory */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-heading font-bold text-[#4A4E69] flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-[#FF8B8B]" />
                        Seleccionar Artículos del Catálogo Agu Agu
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#A8D8EA]/30 text-[#2B6A88]">
                        {selectedProductIds.length} seleccionados
                      </span>
                    </div>
                    <p className="text-xs text-[#8C90A4]">
                      Haz clic en los productos para agregarlos a tu lista de regalos
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectTopEssentials}
                      className="px-3 py-1.5 rounded-xl bg-[#FFF0F2] text-[#FF8B8B] text-xs font-bold hover:bg-[#FFE4E8] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FFEAA7]" />
                      Elegir Esenciales (Top 6)
                    </button>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-xs font-bold text-[#E58C8A] hover:underline self-start sm:self-auto cursor-pointer"
                    >
                      {filteredInventory.length > 0 && filteredInventory.every((p) => selectedProductIds.includes(p.id))
                        ? 'Deseleccionar Visibles'
                        : 'Seleccionar Visibles'}
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#A0A4B8] absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por cunas, ropa, coches, bañeras..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {categories.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[#4A4E69] text-white shadow-xs'
                            : 'bg-[#FAF7F2] text-[#6C7086] hover:bg-[#F0E9DF]'
                        }`}
                      >
                        {cat === 'all' ? 'Todas' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inventory Grid */}
                {isLoadingInventory ? (
                  <div className="py-12 text-center bg-[#FAF7F2] rounded-2xl border border-gray-100">
                    <div className="w-8 h-8 border-3 border-[#A8D8EA] border-t-[#FF8B8B] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-[#8C90A4]">Cargando catálogo oficial...</p>
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-8 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E2D9CF]">
                    <Gift className="w-8 h-8 text-[#A0A4B8] mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-[#8C90A4] font-medium">
                      No hay productos que coincidan con la búsqueda.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
                    {filteredInventory.map((product) => {
                      const isSelected = selectedProductIds.includes(product.id);
                      return (
                        <div
                          key={product.id}
                          onClick={() => toggleProduct(product.id)}
                          className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex gap-3 items-center group relative ${
                            isSelected
                              ? 'border-[#E58C8A] bg-[#FFF5F6] shadow-xs'
                              : 'border-[#F2EAE0] bg-white hover:border-[#A8D8EA]'
                          }`}
                        >
                          <img
                            src={product.imageUrl || (product.images && product.images[0]) || ''}
                            alt={product.name}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#F2EAE0] bg-white"
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-[#4A4E69] truncate">
                              {product.name}
                            </h5>
                            <span className="text-xs font-extrabold text-[#E58C8A]">
                              {currencySymbol}
                              {product.price.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-[#A0A4B8]">
                              {product.category || 'Agu Agu'}
                            </span>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                              isSelected
                                ? 'bg-[#E58C8A] border-[#E58C8A] text-white'
                                : 'border-[#D4CAD0] bg-white group-hover:border-[#A8D8EA]'
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-[#A0A4B8]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedProductIds.length === 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-700 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      Tip: Selecciona los productos que deseas en tu lista, o pulsa <strong>"Elegir Esenciales (Top 6)"</strong> para añadirlos rápidamente.
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 flex items-center justify-between border-t border-[#F2EAE0] shrink-0">
                <div className="text-xs text-[#8C90A4] hidden sm:block">
                  Enlace seguro autogenerado al guardar
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    id="cancel-create-table-btn"
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#8C90A4] hover:text-[#4A4E69] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="submit-create-table-btn"
                    type="submit"
                    disabled={isSubmitting || !familyName.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E58C8A] to-[#F48B7A] text-white font-bold text-xs shadow-md shadow-pink-200/50 hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isSubmitting ? 'Creando Mesa...' : 'Crear Mesa de Regalos'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
