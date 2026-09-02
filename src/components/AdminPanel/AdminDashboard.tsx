import React, { useState, useEffect } from 'react';
import {
  Gift,
  Package,
  Sparkles,
  Settings,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  Phone,
  RefreshCw,
  Eye,
  Calendar,
  AlertCircle,
  Database,
  Store,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Product, GiftTable, TableItem, ExtraProduct, StoreConfig } from '../../types';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getGiftTables,
  getGiftTableById,
  getExtraProducts,
  addExtraProduct,
  updateExtraProduct,
  deleteExtraProduct,
  getStoreConfig,
  updateStoreConfig,
  seedInitialSampleDataIfEmpty,
  resetCatalogWithAguAguData,
  deleteGiftTable,
  subscribeToAdminData,
} from '../../services/dbService';
import { getCanonicalMesaUrl } from '../../utils/slug';
import { ProductModal } from './ProductModal';
import { CreateGiftTableModal } from './CreateGiftTableModal';
import { GiftTableDetailView } from './GiftTableDetailView';
import { AguAguLogo } from '../common/AguAguLogo';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tables' | 'inventory' | 'extras' | 'config'>('tables');
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<GiftTable[]>([]);
  const [extraProducts, setExtraProducts] = useState<ExtraProduct[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    whatsappNumber: '50368687046',
    storeName: 'Agu Agu - Artículos de Bebé',
    currencySymbol: '$',
  });
  
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // In-app Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary' | 'teal';
    isLoading?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // In-app Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Selected table for detailed view
  const [selectedTableData, setSelectedTableData] = useState<{
    table: GiftTable;
    items: TableItem[];
  } | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | ExtraProduct | null>(null);
  const [productModalMode, setProductModalMode] = useState<'inventory' | 'extra'>('inventory');
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);

  // Search in inventory
  const [inventorySearch, setInventorySearch] = useState('');

  // WhatsApp form state
  const [whatsappInput, setWhatsappInput] = useState('');
  const [storeNameInput, setStoreNameInput] = useState('');
  const [currencyInput, setCurrencyInput] = useState('$');
  const [configSaved, setConfigSaved] = useState(false);

  const [dbError, setDbError] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // Auto seed if empty
      await seedInitialSampleDataIfEmpty();

      const [prodsData, tablesData, extrasData, cfgData] = await Promise.all([
        getProducts(),
        getGiftTables(),
        getExtraProducts(),
        getStoreConfig(),
      ]);

      setProducts(prodsData);
      setTables(tablesData);
      setExtraProducts(extrasData);
      setStoreConfig(cfgData);
      setWhatsappInput(cfgData.whatsappNumber || '50368687046');
      setStoreNameInput(cfgData.storeName || 'Agu Agu - Artículos de Bebé');
      setCurrencyInput(cfgData.currencySymbol || '$');
    } catch (err: any) {
      console.error('Error cargando datos de Firestore:', err);
      setDbError(err?.message || 'No se pudieron cargar algunos datos de Firestore. Revisa las reglas de seguridad en Firebase Console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Carga inicial / auto seed
    seedInitialSampleDataIfEmpty().catch(() => {});

    // 2. Suscripción reactiva en tiempo real a Firestore
    const unsubscribe = subscribeToAdminData((liveData) => {
      setProducts(liveData.products);
      setTables(liveData.tables);
      setExtraProducts(liveData.extras);
      setStoreConfig(liveData.storeConfig);
      
      setWhatsappInput((prev) => prev || liveData.storeConfig.whatsappNumber || '50368687046');
      setStoreNameInput((prev) => prev || liveData.storeConfig.storeName || 'Agu Agu - Artículos de Bebé');
      setCurrencyInput((prev) => prev || liveData.storeConfig.currencySymbol || '$');
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenTableDetail = async (tableId: string) => {
    try {
      const data = await getGiftTableById(tableId);
      if (data) {
        setSelectedTableData(data);
      }
    } catch (err) {
      console.error('Error al abrir detalle:', err);
    }
  };

  const handleRefreshSelectedTable = async () => {
    if (selectedTableData) {
      await handleOpenTableDetail(selectedTableData.table.id);
      const tablesData = await getGiftTables();
      setTables(tablesData);
    }
  };

  const copyTableLink = (slug: string) => {
    const fullUrl = getCanonicalMesaUrl(slug);
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleDeleteTable = (tableId: string, familyName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Mesa de Regalos',
      message: '¿Estás seguro de que deseas eliminar esta mesa de regalos? Esta acción borrará la mesa y sus productos reservados de forma permanente.',
      itemName: `Mesa Familia ${familyName}`,
      confirmLabel: 'Eliminar Mesa',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await deleteGiftTable(tableId);
          if (selectedTableData?.table.id === tableId) {
            setSelectedTableData(null);
          }
          await loadAllData();
          showToast(`Mesa de "${familyName}" eliminada correctamente`);
        } catch (err) {
          console.error(err);
          showToast('Error al eliminar la mesa', 'info');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Inventory CRUD
  const handleSaveProduct = async (data: any) => {
    if (productModalMode === 'inventory') {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        showToast('Producto actualizado correctamente');
      } else {
        await addProduct(data);
        showToast('Nuevo producto agregado al inventario');
      }
    } else {
      if (editingProduct) {
        await updateExtraProduct(editingProduct.id, data);
        showToast('Producto extra actualizado');
      } else {
        await addExtraProduct(data);
        showToast('Nuevo producto extra agregado');
      }
    }
    await loadAllData();
  };

  const handleDeleteProduct = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Producto del Inventario',
      message: '¿Seguro que deseas eliminar este producto del inventario? Se retirará de la lista y no estará disponible para nuevas mesas.',
      itemName: name,
      confirmLabel: 'Eliminar Producto',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await deleteProduct(id);
          await loadAllData();
          showToast(`Producto "${name}" eliminado exitosamente`);
        } catch (err) {
          console.error('Error al eliminar producto:', err);
          showToast('Error al eliminar el producto', 'info');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteExtra = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Producto Extra',
      message: '¿Seguro que deseas eliminar este producto de venta cruzada adicional?',
      itemName: name,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await deleteExtraProduct(id);
          await loadAllData();
          showToast(`Producto extra "${name}" eliminado`);
        } catch (err) {
          console.error('Error al eliminar producto extra:', err);
          showToast('Error al eliminar producto extra', 'info');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const [isResettingCatalog, setIsResettingCatalog] = useState(false);

  const handleResetAguAguCatalog = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Sincronizar Catálogo Oficial Agu Agu',
      message: '¿Deseas sincronizar el inventario y las mesas con el catálogo oficial de Agu Agu (15 productos completos con fotos multi-ángulo)?',
      itemName: '15 Productos Oficiales Agu Agu',
      confirmLabel: 'Sincronizar Ahora',
      variant: 'teal',
      onConfirm: async () => {
        setIsResettingCatalog(true);
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await resetCatalogWithAguAguData();
          await loadAllData();
          showToast('¡Catálogo oficial de Agu Agu sincronizado con éxito!');
        } catch (err) {
          console.error(err);
          showToast('Error al sincronizar catálogo', 'info');
        } finally {
          setIsResettingCatalog(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStoreConfig({
        whatsappNumber: whatsappInput.trim(),
        storeName: storeNameInput.trim(),
        currencySymbol: currencyInput.trim() || '$',
      });
      setStoreConfig({
        whatsappNumber: whatsappInput.trim(),
        storeName: storeNameInput.trim(),
        currencySymbol: currencyInput.trim() || '$',
      });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInventory = products.filter((p) =>
    p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(inventorySearch.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3.5">
            <AguAguLogo size="lg" showText={false} />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E0F2F1] text-[#00897B] border border-[#B2DFDB]">
                  Panel de Tienda
                </span>
                <span className="text-xs text-[#8E8D8A] truncate max-w-[180px] sm:max-w-xs" title={user?.email || ''}>
                  {user?.email || 'Administrador Autorizado'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#4A4A4A]">
                Agu Agu - Mesa de Regalos
              </h1>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="md:hidden p-2 rounded-xl text-[#8E8D8A] hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-xs overflow-x-auto">
          <button
            id="tab-tables-btn"
            onClick={() => {
              setActiveTab('tables');
              setSelectedTableData(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'tables'
                ? 'bg-[#FF8B8B] text-white shadow-xs shadow-pink-200/60'
                : 'text-[#5D5C5B] hover:text-[#FF8B8B] hover:bg-[#FDFBF7]'
            }`}
          >
            <Gift className="w-4 h-4" />
            Mesas de Regalo ({tables.length})
          </button>

          <button
            id="tab-inventory-btn"
            onClick={() => {
              setActiveTab('inventory');
              setSelectedTableData(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'inventory'
                ? 'bg-[#A8D8EA] text-[#2C5F70] shadow-xs shadow-blue-200/50'
                : 'text-[#5D5C5B] hover:text-[#2C5F70] hover:bg-[#FDFBF7]'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventario ({products.length})
          </button>

          <button
            id="tab-extras-btn"
            onClick={() => {
              setActiveTab('extras');
              setSelectedTableData(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'extras'
                ? 'bg-[#FFEAA7] text-[#B76E00] shadow-xs'
                : 'text-[#5D5C5B] hover:text-[#B76E00] hover:bg-[#FDFBF7]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Detalles Especiales ({extraProducts.length})
          </button>

          <button
            id="tab-config-btn"
            onClick={() => {
              setActiveTab('config');
              setSelectedTableData(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'config'
                ? 'bg-[#E0F2F1] text-[#00897B] shadow-xs'
                : 'text-[#5D5C5B] hover:text-[#00897B] hover:bg-[#FDFBF7]'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuración WhatsApp
          </button>
        </div>
      </div>

      {dbError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div>
            <p className="font-bold mb-0.5">Aviso de sincronización con Firebase (aguagu-3baf3):</p>
            <p>{dbError}</p>
          </div>
          <button
            onClick={() => handleResetAguAguCatalog()}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
          >
            Sincronizar Catálogo Oficial
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-12 h-12 border-4 border-[#A8D8EA] border-t-[#FF8B8B] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#8E8D8A] font-medium">Cargando base de datos de la tienda...</p>
        </div>
      ) : (
        <>
          {/* ================================================================= */}
          {/* TAB 1: MESAS DE REGALO */}
          {/* ================================================================= */}
          {activeTab === 'tables' && (
            <div>
              {selectedTableData ? (
                <GiftTableDetailView
                  table={selectedTableData.table}
                  items={selectedTableData.items}
                  inventory={products}
                  currencySymbol={storeConfig.currencySymbol}
                  onBack={() => setSelectedTableData(null)}
                  onRefresh={handleRefreshSelectedTable}
                />
              ) : (
                <div className="space-y-6">
                  {/* Top Bar for Tables */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
                    <div>
                      <h2 className="font-heading font-bold text-xl text-[#4A4A4A]">
                        Mesas de Regalo Registradas
                      </h2>
                      <p className="text-xs text-[#8E8D8A]">
                        Crea mesas con slug único o gestiona los estados de los regalos de cada familia
                      </p>
                    </div>

                    <button
                      id="btn-open-create-table-modal"
                      onClick={() => setIsCreateTableModalOpen(true)}
                      className="px-5 py-2.5 rounded-2xl bg-[#FF8B8B] text-white font-bold text-xs shadow-md shadow-pink-200/50 hover:bg-[#ff7a7a] active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Nueva Mesa de Regalo
                    </button>
                  </div>

                  {/* Tables List */}
                  {tables.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
                      <Gift className="w-12 h-12 text-[#FF8B8B] mx-auto mb-3 opacity-60" />
                      <h3 className="text-base font-bold text-[#4A4A4A] mb-1">
                        No hay mesas de regalo creadas aún
                      </h3>
                      <p className="text-xs text-[#8E8D8A] max-w-md mx-auto mb-4">
                        Crea la primera mesa de regalos para una familia o cliente de tu tienda de bebés.
                      </p>
                      <button
                        onClick={() => setIsCreateTableModalOpen(true)}
                        className="px-5 py-2.5 rounded-xl bg-[#FF8B8B] text-white text-xs font-bold hover:bg-[#ff7a7a] shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        Crear Mesa Ahora
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {tables.map((table) => (
                        <div
                          key={table.id}
                          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F7C8D0] text-[#D64E66]">
                                {table.babyName ? `Baby ${table.babyName}` : 'Mesa de Regalo'}
                              </span>
                              <span className="text-[11px] text-[#8E8D8A] flex items-center gap-1 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-[#FFEAA7]" />
                                {table.eventDate}
                              </span>
                            </div>

                            <h3 className="font-heading font-bold text-lg text-[#4A4A4A] mb-1 group-hover:text-[#FF8B8B] transition-colors">
                              {table.familyName}
                            </h3>

                            {table.greeting && (
                              <p className="text-xs text-[#8E8D8A] line-clamp-2 italic mb-4">
                                "{table.greeting}"
                              </p>
                            )}

                            {/* Public Link Box */}
                            <div className="bg-[#FDFBF7] p-2.5 rounded-2xl border border-gray-100 mb-4 flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-[#4A4A4A] truncate">
                                #mesa/{table.slug}
                              </span>
                              <button
                                id={`btn-copy-slug-${table.slug}`}
                                onClick={() => copyTableLink(table.slug)}
                                className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-[11px] font-bold text-[#5D5C5B] hover:text-[#FF8B8B] flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                              >
                                {copiedSlug === table.slug ? (
                                  <Check className="w-3 h-3 text-[#00897B]" />
                                ) : (
                                  <Copy className="w-3 h-3 text-[#A8D8EA]" />
                                )}
                                {copiedSlug === table.slug ? 'Copiado' : 'Copiar'}
                              </button>
                            </div>

                            {/* Progress info */}
                            <div className="flex items-center justify-between text-xs text-[#5D5C5B] font-semibold mb-1">
                              <span>Regalos elegidos / reservados:</span>
                              <span className="text-[#FF8B8B] font-bold">
                                {table.completedCount || 0} de {table.itemCount || 0}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-[#FDFBF7] border border-gray-100 rounded-full overflow-hidden mb-4">
                              <div
                                className="h-full bg-gradient-to-r from-[#A8D8EA] to-[#FF8B8B] rounded-full transition-all"
                                style={{
                                  width: `${
                                    table.itemCount && table.itemCount > 0
                                      ? Math.min(100, Math.round(((table.completedCount || 0) / table.itemCount) * 100))
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                            <button
                              id={`btn-open-detail-${table.id}`}
                              onClick={() => handleOpenTableDetail(table.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#5D5C5B] text-white text-xs font-bold hover:bg-[#4A4A4A] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#A8D8EA]" />
                              Ver Detalle y Productos
                            </button>

                            <div className="flex items-center gap-1">
                              <a
                                href={`#mesa/${table.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-xl text-[#8E8D8A] hover:text-[#FF8B8B] hover:bg-[#FDFBF7] transition-colors"
                                title="Ver vista pública"
                              >
                                <ExternalLink className="w-4 h-4 text-[#A8D8EA]" />
                              </a>
                              <button
                                onClick={() => handleDeleteTable(table.id, table.familyName)}
                                className="p-1.5 rounded-xl text-[#8E8D8A] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Eliminar mesa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: INVENTARIO GENERAL */}
          {/* ================================================================= */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
                <div>
                  <h2 className="font-heading font-bold text-xl text-[#4A4A4A]">
                    Inventario de Productos ({products.length})
                  </h2>
                  <p className="text-xs text-[#8E8D8A]">
                    Productos disponibles en tienda para que los padres agreguen a sus mesas
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#8E8D8A] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o categoría..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-[#FDFBF7] text-xs text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] w-52 sm:w-60"
                    />
                  </div>

                  <button
                    id="btn-sync-aguagu-catalog"
                    onClick={handleResetAguAguCatalog}
                    disabled={isResettingCatalog}
                    className="px-3.5 py-2 rounded-xl bg-[#E0F2F1] text-[#00897B] border border-[#B2DFDB] hover:bg-[#b2dfdb]/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Cargar productos, fotos reales y precios de la tienda oficial Agu Agu"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResettingCatalog ? 'animate-spin' : ''}`} />
                    {isResettingCatalog ? 'Sincronizando...' : 'Sincronizar Catálogo Agu Agu'}
                  </button>

                  <button
                    id="btn-add-new-inventory-prod"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductModalMode('inventory');
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#FF8B8B] text-white text-xs font-bold hover:bg-[#ff7a7a] transition-all flex items-center gap-1.5 shadow-md shadow-pink-200/50 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Producto
                  </button>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredInventory.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between group hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 border border-gray-100 bg-[#FAF7F2]">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.category && (
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-xs text-[#5D5C5B] shadow-2xs">
                            {product.category}
                          </span>
                        )}
                        {product.images && product.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/65 backdrop-blur-xs text-white shadow-2xs">
                            📷 {product.images.length} fotos
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-[#4A4A4A] mb-1 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-[#8E8D8A] line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3">
                        <span className="text-base font-extrabold text-[#FF8B8B]">
                          {storeConfig.currencySymbol}
                          {product.price.toFixed(2)}
                        </span>
                        <span className="text-[11px] font-bold text-[#00897B] bg-[#E0F2F1] px-2.5 py-0.5 rounded-full">
                          Stock: {product.quantity}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setProductModalMode('inventory');
                            setIsProductModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl text-[#5D5C5B] hover:text-[#FF8B8B] hover:bg-[#FDFBF7] transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="p-1.5 rounded-xl text-[#8E8D8A] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: PRODUCTOS EXTRA / VENTA CRUZADA */}
          {/* ================================================================= */}
          {activeTab === 'extras' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFEAA7] text-[#B76E00]">
                      Detalles Especiales
                    </span>
                  </div>
                  <h2 className="font-heading font-bold text-xl text-[#4A4A4A]">
                    Detalles Especiales y Extras ({extraProducts.length})
                  </h2>
                  <p className="text-xs text-[#8E8D8A]">
                    Estos productos se sincronizan automáticamente con tu inventario y se muestran como sugerencias en las mesas de regalo
                  </p>
                </div>

                <button
                  id="btn-add-extra-prod"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalMode('extra');
                    setIsProductModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FF8B8B] text-white text-xs font-bold hover:bg-[#ff7a7a] transition-all flex items-center gap-1.5 shadow-md shadow-pink-200/50 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Producto Extra
                </button>
              </div>

              {/* Extras Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {extraProducts.map((extra) => (
                  <div
                    key={extra.id}
                    className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between group hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 border border-gray-100 bg-[#FAF7F2]">
                        <img
                          src={extra.imageUrl}
                          alt={extra.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {extra.badge && (
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F7C8D0] text-[#D64E66] shadow-2xs">
                            {extra.badge}
                          </span>
                        )}
                        {extra.images && extra.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/65 backdrop-blur-xs text-white shadow-2xs">
                            📷 {extra.images.length} fotos
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-[#4A4A4A] mb-1 line-clamp-1">
                        {extra.name}
                      </h3>
                      <p className="text-xs text-[#8E8D8A] line-clamp-2 mb-3">
                        {extra.description}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3">
                        <span className="text-base font-extrabold text-[#FF8B8B]">
                          {storeConfig.currencySymbol}
                          {extra.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(extra);
                            setProductModalMode('extra');
                            setIsProductModalOpen(true);
                          }}
                          className="p-1.5 rounded-xl text-[#5D5C5B] hover:text-[#FF8B8B] hover:bg-[#FDFBF7] transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExtra(extra.id, extra.name)}
                          className="p-1.5 rounded-xl text-[#8E8D8A] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: CONFIGURACIÓN DE WHATSAPP Y TIENDA */}
          {/* ================================================================= */}
          {activeTab === 'config' && (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-[#E0F2F1] flex items-center justify-center text-[#25D366] shadow-xs">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-xl text-[#4A4A4A]">
                    Configuración de WhatsApp de la Tienda
                  </h2>
                  <p className="text-xs text-[#8E8D8A]">
                    Número receptor para pagos con tarjeta y consultas de invitados
                  </p>
                </div>
              </div>

              {configSaved && (
                <div className="mb-6 p-4 rounded-2xl bg-[#E0F2F1] border border-[#B2DFDB] text-xs font-bold text-[#00897B] flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  ¡Configuración guardada exitosamente en Firestore!
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#5D5C5B] mb-1.5">
                    Número de WhatsApp de la Tienda (con código de país) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8E8D8A] absolute left-3.5 top-3" />
                    <input
                      id="input-whatsapp-number"
                      type="text"
                      required
                      placeholder="Ej: 50368687046 o +503 6868 7046"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-[#FDFBF7] text-sm text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>
                  <p className="text-[11px] text-[#8E8D8A] mt-1">
                    Solo dígitos numéricos incluyendo el código de país (ej. 503 para El Salvador: 50368687046, 502 para Guatemala, 52 para México).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5D5C5B] mb-1.5">
                      Nombre de la Tienda *
                    </label>
                    <input
                      id="input-store-name"
                      type="text"
                      required
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-[#FDFBF7] text-sm text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5D5C5B] mb-1.5">
                      Símbolo de Moneda *
                    </label>
                    <input
                      id="input-currency-symbol"
                      type="text"
                      required
                      placeholder="Ej: $ o Q o €"
                      value={currencyInput}
                      onChange={(e) => setCurrencyInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-[#FDFBF7] text-sm text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                    />
                  </div>
                </div>

                {/* WhatsApp Message Preview */}
                <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-gray-100 space-y-2">
                  <span className="block text-xs font-bold text-[#4A4A4A]">
                    Vista Previa del Mensaje que Recibirá la Tienda:
                  </span>
                  <div className="p-3 bg-[#DCF8C6]/80 rounded-xl text-xs text-[#2A4D34] font-mono whitespace-pre-line border border-[#C5E1A5]">
                    👶 *¡Hola {storeNameInput || 'Agu Agu - Artículos de Bebé'}!* Quisiera pagar con tarjeta un regalo de la *Mesa de Regalo*.{'\n'}
                    📋 *Detalles:* Mesa Familia Gómez | Cuna Nórdica | Valor: {currencyInput}280.00{'\n'}
                    🎁 *Donante:* María Fernández (Tel: 555-1234){'\n'}
                    💳 *Solicitud:* Por favor envíenme el enlace para realizar el pago con tarjeta.
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    id="btn-save-store-config"
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#FF8B8B] text-white font-bold text-xs shadow-md shadow-pink-200/50 hover:bg-[#ff7a7a] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#FFEAA7]" />
                    Guardar Configuración
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4A4E69] text-white px-5 py-3 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4EBA88]" />
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* In-app Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          itemName={confirmDialog.itemName}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          isLoading={confirmDialog.isLoading}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Product Modal for Inventory & Extras */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
        mode={productModalMode}
        currencySymbol={storeConfig.currencySymbol}
      />

      {/* Create Gift Table Modal */}
      <CreateGiftTableModal
        isOpen={isCreateTableModalOpen}
        onClose={() => setIsCreateTableModalOpen(false)}
        inventory={products}
        currencySymbol={storeConfig.currencySymbol}
        onTableCreated={() => {
          loadAllData();
          showToast('¡Mesa de regalos creada con éxito!');
        }}
      />
    </div>
  );
};
