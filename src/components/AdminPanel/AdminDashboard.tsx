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
  Eye,
  Calendar,
  AlertCircle,
  Database,
  Store,
  LogOut,
  FileSpreadsheet,
  Image as ImageIcon,
  Upload,
  Loader2,
  Clock,
  RotateCcw,
  ShieldCheck,
  History,
  Info,
  ChevronRight,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Product, GiftTable, TableItem, ExtraProduct, StoreConfig, DeletedGiftTable } from '../../types';
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
  deleteGiftTable,
  subscribeToAdminData,
  moveToTrashGiftTable,
  getDeletedGiftTables,
  restoreGiftTable,
  permanentlyDeleteGiftTable,
} from '../../services/dbService';
import { getCanonicalMesaUrl } from '../../utils/slug';
import { ProductModal } from './ProductModal';
import { CreateGiftTableModal } from './CreateGiftTableModal';
import { ImportInventoryModal } from './ImportInventoryModal';
import { GiftTableDetailView } from './GiftTableDetailView';
import { AguAguLogo } from '../common/AguAguLogo';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { uploadStoreLogo } from '../../services/storageService';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tables' | 'trash' | 'inventory' | 'extras' | 'config' | 'backups'>('tables');
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<GiftTable[]>([]);
  const [deletedTables, setDeletedTables] = useState<DeletedGiftTable[]>([]);
  const [extraProducts, setExtraProducts] = useState<ExtraProduct[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    whatsappNumber: '50368687046',
    storeName: 'Agu Agu - Artículos de Bebé',
    currencySymbol: '$',
  });
  
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | ExtraProduct | null>(null);
  const [productModalMode, setProductModalMode] = useState<'inventory' | 'extra'>('inventory');
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);

  // Search in inventory
  const [inventorySearch, setInventorySearch] = useState('');

  // WhatsApp form state
  const [whatsappInput, setWhatsappInput] = useState('');
  const [storeNameInput, setStoreNameInput] = useState('');
  const [currencyInput, setCurrencyInput] = useState('$');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const [configSaved, setConfigSaved] = useState(false);

  const [dbError, setDbError] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const [prodsData, tablesData, deletedData, extrasData, cfgData] = await Promise.all([
        getProducts(),
        getGiftTables(),
        getDeletedGiftTables(),
        getExtraProducts(),
        getStoreConfig(),
      ]);

      setProducts(prodsData);
      setTables(tablesData);
      setDeletedTables(deletedData);
      setExtraProducts(extrasData);
      setStoreConfig(cfgData);
      setWhatsappInput(cfgData.whatsappNumber || '50368687046');
      setStoreNameInput(cfgData.storeName || 'Agu Agu - Artículos de Bebé');
      setCurrencyInput(cfgData.currencySymbol || '$');
      setLogoUrlInput(cfgData.logoUrl || '');
    } catch (err: any) {
      console.error('Error cargando datos de Firestore:', err);
      setDbError(err?.message || 'No se pudieron cargar algunos datos de Firestore. Revisa las reglas de seguridad en Firebase Console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Suscripción reactiva en tiempo real a Firestore
    const unsubscribe = subscribeToAdminData((liveData) => {
      setProducts(liveData.products);
      setTables(liveData.tables);
      setDeletedTables(liveData.deletedTables || []);
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

  const copyCommandText = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(key);
    setTimeout(() => setCopiedCommand(null), 2500);
    showToast('Comando gcloud copiado al portapapeles');
  };

  /**
   * Mover mesa a la papelera (deleted_gift_tables) con retención de 15 días
   */
  const handleDeleteTable = (tableId: string, familyName: string) => {
    if (!user || !isAdmin) {
      showToast('No tienes permisos de administrador para eliminar mesas de regalos.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Mover Mesa a la Papelera',
      message: '¿Deseas mover esta mesa de regalos a la papelera de retención? Se conservará con el 100% de sus datos, productos y reservas durante 15 días, pudiendo restaurarla en cualquier momento.',
      itemName: `Mesa Familia ${familyName}`,
      confirmLabel: 'Mover a Papelera',
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await moveToTrashGiftTable(tableId, user?.email || undefined);
          setTables((prev) => prev.filter((t) => t.id !== tableId));
          if (selectedTableData?.table.id === tableId) {
            setSelectedTableData(null);
          }
          showToast(`Mesa de "${familyName}" enviada a la papelera (Retención: 15 días)`, 'success');
          loadAllData().catch(() => {});
        } catch (err: any) {
          console.error('[MOVE TO TRASH ERROR]:', err);
          const errorMsg = err?.message || 'Error desconocido al mover la mesa a la papelera';
          showToast(`No se pudo mover a la papelera: ${errorMsg}`, 'info');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  /**
   * Restaurar una mesa desde la papelera de regreso a mesas activas
   */
  const handleRestoreTable = (tableId: string, familyName: string) => {
    if (!user || !isAdmin) {
      showToast('No tienes permisos de administrador para restaurar mesas de regalos.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Restaurar Mesa de Regalos',
      message: '¿Deseas restaurar esta mesa de regalos? Volverá a estar activa con su ID original, enlace público, catálogo de productos y el estado exacto de todas sus reservas.',
      itemName: `Mesa Familia ${familyName}`,
      confirmLabel: 'Restaurar Mesa',
      variant: 'teal',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await restoreGiftTable(tableId);
          setDeletedTables((prev) => prev.filter((t) => t.id !== tableId));
          showToast(`✓ Mesa de "${familyName}" restaurada con éxito a mesas activas`, 'success');
          loadAllData().catch(() => {});
        } catch (err: any) {
          console.error('[RESTORE TABLE ERROR]:', err);
          const errorMsg = err?.message || 'Error al restaurar la mesa';
          showToast(`No se pudo restaurar la mesa: ${errorMsg}`, 'info');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  /**
   * Eliminar definitivamente una mesa de la papelera
   */
  const handlePermanentlyDeleteTable = (tableId: string, familyName: string) => {
    if (!user || !isAdmin) {
      showToast('No tienes permisos de administrador para eliminar mesas de regalos.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Definitivamente',
      message: 'Esta acción eliminará definitivamente la mesa y sus datos. No podrá restaurarse desde la papelera.',
      itemName: `Mesa Familia ${familyName}`,
      confirmLabel: 'Eliminar Definitivamente',
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await permanentlyDeleteGiftTable(tableId);
          setDeletedTables((prev) => prev.filter((t) => t.id !== tableId));
          showToast(`Mesa de "${familyName}" eliminada definitivamente de la base de datos`, 'success');
        } catch (err: any) {
          console.error('[PERMANENT DELETE ERROR]:', err);
          const errorMsg = err?.message || 'Error al eliminar definitivamente la mesa';
          showToast(`No se pudo eliminar definitivamente: ${errorMsg}`, 'info');
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
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? { ...p, ...data } : p))
        );
        showToast('Producto actualizado correctamente');
      } else {
        const newId = await addProduct(data);
        setProducts((prev) => [{ id: newId, ...data }, ...prev]);
        showToast('Nuevo producto agregado al inventario');
      }
    } else {
      if (editingProduct) {
        await updateExtraProduct(editingProduct.id, data);
        setExtraProducts((prev) =>
          prev.map((e) => (e.id === editingProduct.id ? { ...e, ...data } : e))
        );
        showToast('Producto extra actualizado');
      } else {
        const newExtraId = await addExtraProduct(data);
        setExtraProducts((prev) => [{ id: newExtraId, ...data }, ...prev]);
        showToast('Nuevo producto extra agregado');
      }
    }
    // Sincronización en segundo plano sin bloquear el cierre del modal ni la interfaz
    loadAllData().catch(() => {});
  };

  const TARGET_TEST_PRODUCT_IDS = [
    '0ybqMB8OpZ72PVWgLu91', // Set de 3 Biberones Dr. Brown's Options+ Anticólicos Cuello Ancho
    'MjIAyLC9HU5XGK79IfiC', // Toallitas Húmedas Lucca Extra Grande x80 Unidades con Tapa
    'MptUy54X94qQGJ2rNsrv', // Conjunto Playero 2 Piezas con Protección UV Camaleón
    'VDoNggrhKRBvB3EpdkZf', // Set Completo de Cuidado y Baño Johnson's Baby con Esponja
    'bpvmrh6h9sgrHEuDgp4Q', // Andadera Didáctica Caminador de Empuje Rosa con Pizarra Mágica
    'dB9Ek0bQ1mfpaXBpl9rV', // Vestido Infantil Manga Larga Beige con Falda a Cuadros y Osito
    'giEZroeV6J4Z0z8y6gcN', // Enterizo de Algodón Kimono con Estampado de Ositos
    'iGp1I1b8Kk5B9Ty6dtta', // Gimnasio de Estimulación Temprana Fisher-Price Selva Tropical
    'lmiXSFHvtPkXEJDDzrkK', // Cuna Colecho Safety 1st Ajustable con Lateral Abatible
    'mGYvqDYNeirNxTcZffuL', // Coche Travel System 3 en 1 con Moisés Reversible Rosa Pastel
    'on6mTLM4Is3pqRtB1JE8', // Andadera de Aprendizaje Musical 2 en 1 Asiento y Teclado Gris
    'pq9egmCOlWPtnceCI3el', // Asiento Ergonómico de Tina Antideslizante Nuby (0-6m)
    'wTT93XGygQluGUrmLMNw', // Enterizo Pelele de Algodón Acanalado Verde Salvia con Pies
    'yZcabVfyV6OE3bMTYrTx', // Cuna Corral Plegable 2 Niveles con Cambiador y Maletín
  ];

  const handleBatchCleanupTestProducts = () => {
    if (!user || !isAdmin) {
      showToast('No tienes permisos de administrador.', 'info');
      return;
    }

    const testProductsToDelete = products.filter((p) => TARGET_TEST_PRODUCT_IDS.includes(p.id));
    if (testProductsToDelete.length === 0) {
      showToast('No hay productos de prueba pendientes de eliminación.', 'info');
      return;
    }

    // Validación estricta: Garantizar que Softcare NO sea tocado jamás
    const softcareIncluded = testProductsToDelete.some((p) => p.id === '7rlL747WF2jIid2FWlt0');
    if (softcareIncluded) {
      showToast('Operación abortada por seguridad: Pañales Softcare está protegido.', 'info');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: `Eliminar ${testProductsToDelete.length} Productos de Prueba`,
      message: `¿Deseas eliminar permanentemente los ${testProductsToDelete.length} productos de prueba iniciales del inventario? Pañales Softcare, las mesas de regalos y las reservas no serán afectados.`,
      itemName: `${testProductsToDelete.length} productos de prueba`,
      confirmLabel: `Eliminar ${testProductsToDelete.length} Productos`,
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        let deletedCount = 0;
        try {
          for (const prod of testProductsToDelete) {
            await deleteProduct(prod.id, prod);
            deletedCount++;
          }
          setProducts((prev) => prev.filter((p) => !TARGET_TEST_PRODUCT_IDS.includes(p.id)));
          showToast(`✓ Se eliminaron ${deletedCount} productos de prueba exitosamente.`, 'success');
          loadAllData().catch(() => {});
        } catch (err: any) {
          console.error('[BATCH CLEANUP ERROR]:', err);
          showToast(`Error al eliminar: ${err?.message || 'Error desconocido'}`, 'info');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteProduct = (id: string, name: string) => {
    // 1. Botón Eliminar presionado -> Validación previa de permisos
    if (!user || !isAdmin) {
      showToast('No tienes permisos de administrador para eliminar productos del inventario.', 'info');
      return;
    }

    // 2. Obtención de datos del producto para identificar fotografía(s)
    const productToDelete = products.find((p) => p.id === id);

    // 3. Confirmación en UI
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Producto del Inventario',
      message: '¿Seguro que deseas eliminar este producto del inventario? Esta acción es permanente y retirará el producto de la base de datos.',
      itemName: name,
      confirmLabel: 'Eliminar Producto',
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        // Iniciar loading en el diálogo
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));

        try {
          // 4. Eliminación real y esperada en Firestore + limpieza segura de Storage
          await deleteProduct(id, productToDelete);

          // 5. Confirmación de operaciones: Actualización de estado en UI
          setProducts((prev) => prev.filter((p) => p.id !== id));
          showToast(`Producto "${name}" eliminado exitosamente`, 'success');

          // Recargar datos en segundo plano
          loadAllData().catch(() => {});
        } catch (err: any) {
          console.error('[DELETE PRODUCT ERROR]:', err);
          const errorMsg = err?.message || 'Error desconocido al eliminar el producto';
          showToast(`No se pudo eliminar el producto: ${errorMsg}`, 'info');
        } finally {
          // 6. FINALLY OBLIGATORIO:
          // El estado de carga DEBE finalizar SIEMPRE, sin importar si Firestore falló,
          // Storage falló, o hubo cualquier error de red o timeout.
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteExtra = (id: string, name: string) => {
    if (!user || !isAdmin) {
      showToast('No tienes permisos de administrador para eliminar productos extra.', 'info');
      return;
    }

    const extraToDelete = extraProducts.find((e) => e.id === id);

    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Producto Extra',
      message: '¿Seguro que deseas eliminar este producto de venta cruzada adicional?',
      itemName: name,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        try {
          await deleteExtraProduct(id, extraToDelete);
          setExtraProducts((prev) => prev.filter((p) => p.id !== id));
          showToast(`Producto extra "${name}" eliminado exitosamente`, 'success');
          loadAllData().catch(() => {});
        } catch (err: any) {
          console.error('[DELETE EXTRA ERROR]:', err);
          const errorMsg = err?.message || 'Error al eliminar el producto extra';
          showToast(`No se pudo eliminar el producto: ${errorMsg}`, 'info');
        } finally {
          // FINALLY OBLIGATORIO: Siempre finaliza el estado de carga
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig: StoreConfig = {
        whatsappNumber: whatsappInput.trim(),
        storeName: storeNameInput.trim(),
        currencySymbol: currencyInput.trim() || '$',
        logoUrl: logoUrlInput.trim(),
      };
      await updateStoreConfig(updatedConfig);
      setStoreConfig(updatedConfig);
      setConfigSaved(true);
      showToast('¡Configuración de tienda guardada exitosamente!', 'success');
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar la configuración', 'info');
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const uploadedUrl = await uploadStoreLogo(file);
      setLogoUrlInput(uploadedUrl);
      const updatedConfig: StoreConfig = {
        ...storeConfig,
        whatsappNumber: whatsappInput.trim() || storeConfig.whatsappNumber,
        storeName: storeNameInput.trim() || storeConfig.storeName,
        currencySymbol: currencyInput.trim() || storeConfig.currencySymbol,
        logoUrl: uploadedUrl,
      };
      await updateStoreConfig(updatedConfig);
      setStoreConfig(updatedConfig);
      showToast('¡Logotipo oficial de Agu Agu actualizado con éxito!', 'success');
    } catch (err: any) {
      console.error('Error subiendo logo:', err);
      showToast('No se pudo subir el logotipo: ' + (err?.message || 'Error desconocido'), 'info');
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleResetLogo = async () => {
    setIsUploadingLogo(true);
    try {
      setLogoUrlInput('');
      const updatedConfig: StoreConfig = {
        ...storeConfig,
        whatsappNumber: whatsappInput.trim() || storeConfig.whatsappNumber,
        storeName: storeNameInput.trim() || storeConfig.storeName,
        currencySymbol: currencyInput.trim() || storeConfig.currencySymbol,
        logoUrl: '',
      };
      await updateStoreConfig(updatedConfig);
      setStoreConfig(updatedConfig);
      showToast('Logotipo restablecido al predeterminado de Agu Agu.', 'success');
    } catch (err: any) {
      console.error('Error al restablecer logo:', err);
      showToast('Error al restablecer el logotipo.', 'info');
    } finally {
      setIsUploadingLogo(false);
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
            id="tab-trash-btn"
            onClick={() => {
              setActiveTab('trash');
              setSelectedTableData(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'trash'
                ? 'bg-rose-100 text-rose-800 shadow-xs border border-rose-200'
                : 'text-[#5D5C5B] hover:text-rose-700 hover:bg-rose-50/50'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            Mesas Eliminadas
            {deletedTables.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                {deletedTables.length}
              </span>
            )}
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

          <button
            id="tab-backups-btn"
            onClick={() => {
              setActiveTab('backups');
              setSelectedTableData(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
              activeTab === 'backups'
                ? 'bg-emerald-100 text-emerald-800 shadow-xs border border-emerald-200'
                : 'text-[#5D5C5B] hover:text-emerald-700 hover:bg-emerald-50/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Respaldos Firestore
          </button>
        </div>
      </div>

      {dbError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div>
            <p className="font-bold mb-0.5">Aviso de conexión con Firebase (aguagu-3baf3):</p>
            <p>{dbError}</p>
          </div>
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
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F7C8D0] text-[#D64E66]">
                                  {table.babyName ? `Baby ${table.babyName}` : 'Mesa de Regalo'}
                                </span>
                                {table.gender && table.gender !== 'No especificado' && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    table.gender.toLowerCase().includes('niñ') && table.gender.toLowerCase().includes('a')
                                      ? 'bg-pink-100 text-pink-700'
                                      : table.gender.toLowerCase().includes('niño')
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {table.gender}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#8E8D8A] font-semibold">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-[#FFEAA7]" />
                                  {table.eventDate}
                                </span>
                                {table.eventTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#A8D8EA]" />
                                    {table.eventTime}
                                  </span>
                                )}
                              </div>
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

                  {products.some((p) => TARGET_TEST_PRODUCT_IDS.includes(p.id)) && (
                    <button
                      id="btn-cleanup-test-inventory"
                      onClick={handleBatchCleanupTestProducts}
                      className="px-3.5 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                      title="Eliminar los productos de prueba iniciales del inventario"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      Limpiar {products.filter((p) => TARGET_TEST_PRODUCT_IDS.includes(p.id)).length} productos de prueba
                    </button>
                  )}

                  <button
                    id="btn-import-excel-inventory"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-white text-[#00897B] border border-[#00897B]/30 hover:bg-[#E0F2F1]/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                    title="Subir inventario masivo desde hoja de Excel o CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#00897B]" />
                    Importar Excel / CSV
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
              {filteredInventory.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
                  <Package className="w-12 h-12 text-[#A8D8EA] mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-[#4A4A4A] mb-1">
                    {inventorySearch ? 'No se encontraron productos coincidentes' : 'No hay productos en inventario'}
                  </h3>
                  <p className="text-xs text-[#8E8D8A] max-w-md mx-auto mb-4">
                    {inventorySearch
                      ? `Prueba buscando con otro término o limpia la barra de búsqueda.`
                      : `Puedes crear productos manualmente uno a uno o importar una hoja completa de Excel / CSV.`}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#E0F2F1] text-[#00897B] text-xs font-bold hover:bg-[#b2dfdb]/50 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Importar Excel / CSV
                    </button>
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductModalMode('inventory');
                        setIsProductModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#FF8B8B] text-white text-xs font-bold hover:bg-[#ff7a7a] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Producto
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
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
          {/* TAB: PAPELERA DE MESAS ELIMINADAS (15 DÍAS DE RETENCIÓN) */}
          {/* ================================================================= */}
          {activeTab === 'trash' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Papelera de Retención (15 días)
                    </span>
                    <span className="text-xs text-[#8E8D8A]">
                      {deletedTables.length} {deletedTables.length === 1 ? 'mesa archivada' : 'mesas archivadas'}
                    </span>
                  </div>
                  <h2 className="font-heading font-bold text-xl text-[#4A4A4A]">
                    Mesas de Regalo Eliminadas
                  </h2>
                  <p className="text-xs text-[#8E8D8A] mt-0.5 max-w-2xl">
                    Las mesas eliminadas no se destruyen inmediatamente. Se conservan durante 15 días con todos sus datos, regalos y reservas para que puedas restaurarlas con un solo clic.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      loadAllData();
                      showToast('Papelera actualizada');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-[#5D5C5B] hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    Actualizar
                  </button>
                </div>
              </div>

              {/* Informational Banner: Papelera vs Real Firestore Backup */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start gap-3.5 text-xs text-amber-950">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-amber-900">
                    Diferencia entre Papelera y Respaldo de Base de Datos:
                  </p>
                  <p className="text-amber-900/90 leading-relaxed">
                    Esta papelera funciona a nivel de aplicación para proteger contra eliminaciones accidentales de mesas individuales durante 15 días sin tocar el inventario general. Para copias completas de la base de datos de Firestore (PITR y Backups programados de Google Cloud), consulta la pestaña <button onClick={() => setActiveTab('backups')} className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer">Respaldos Firestore</button>.
                  </p>
                </div>
              </div>

              {/* Empty state */}
              {deletedTables.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs max-w-xl mx-auto">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <Trash2 className="w-8 h-8 text-rose-400" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-[#4A4A4A] mb-1">
                    No hay mesas en la papelera
                  </h3>
                  <p className="text-xs text-[#8E8D8A] mb-6 max-w-sm mx-auto">
                    Cuando elimines una mesa de regalos activa, permanecerá aquí durante 15 días con todos sus regalos y reservas intactas antes de su eliminación permanente.
                  </p>
                  <button
                    onClick={() => setActiveTab('tables')}
                    className="px-5 py-2.5 rounded-xl bg-[#FF8B8B] text-white text-xs font-bold shadow-xs hover:bg-[#ff7a7a] transition-all cursor-pointer"
                  >
                    Ver Mesas Activas
                  </button>
                </div>
              ) : (
                /* Grid of Deleted Tables */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {deletedTables.map((dTable) => {
                    const nowMs = Date.now();
                    const expiresMs = new Date(dTable.expiresAt).getTime();
                    const daysRemaining = Math.max(0, Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24)));
                    const isUrgent = daysRemaining <= 3;

                    return (
                      <div
                        key={dTable.id}
                        className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
                      >
                        {/* Status bar on top */}
                        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-100">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {daysRemaining === 0
                              ? 'Período cumplido'
                              : `Eliminación en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`}
                          </span>

                          <span className="text-[11px] text-[#8E8D8A] font-medium">
                            ID: {dTable.id.slice(0, 8)}...
                          </span>
                        </div>

                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-heading font-bold text-base text-[#4A4A4A] line-clamp-1">
                              Familia {dTable.familyName}
                            </h3>
                            {dTable.gender && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  dTable.gender === 'boy'
                                    ? 'bg-[#A8D8EA]/40 text-[#2C5F70]'
                                    : dTable.gender === 'girl'
                                    ? 'bg-[#F7C8D0]/50 text-[#D64E66]'
                                    : 'bg-[#FFEAA7]/50 text-[#B76E00]'
                                }`}
                              >
                                {dTable.gender === 'boy' ? 'Niño' : dTable.gender === 'girl' ? 'Niña' : 'Sorpresa'}
                              </span>
                            )}
                          </div>

                          {dTable.babyName && (
                            <p className="text-xs font-semibold text-[#FF8B8B] mb-2">
                              Bebé: {dTable.babyName}
                            </p>
                          )}

                          <div className="space-y-1.5 text-xs text-[#6B7280] bg-gray-50/70 p-3 rounded-2xl mb-4 border border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-[#8E8D8A]">Evento:</span>
                              <span className="font-medium text-[#4A4A4A]">
                                {dTable.eventDate || 'Sin fecha'} {dTable.eventTime ? `• ${dTable.eventTime}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#8E8D8A]">Regalos conservados:</span>
                              <span className="font-bold text-[#2C5F70]">
                                {dTable.completedCount} reservados de {dTable.itemCount}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#8E8D8A]">Eliminada el:</span>
                              <span className="font-medium text-[#4A4A4A]">
                                {new Date(dTable.deletedAt).toLocaleDateString('es-SV', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            {dTable.deletedBy && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#8E8D8A]">Eliminada por:</span>
                                <span className="font-medium text-[#4A4A4A] truncate max-w-[150px]" title={dTable.deletedBy}>
                                  {dTable.deletedBy}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                          <button
                            id={`btn-restore-${dTable.id}`}
                            onClick={() => handleRestoreTable(dTable.id, dTable.familyName)}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#E0F2F1] text-[#00897B] hover:bg-[#b2dfdb] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restaurar Mesa
                          </button>

                          <button
                            id={`btn-perm-delete-${dTable.id}`}
                            onClick={() => handlePermanentlyDeleteTable(dTable.id, dTable.familyName)}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar definitivamente de Firestore"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

              <form onSubmit={handleSaveConfig} className="space-y-6">
                {/* Store Logo Management Section */}
                <div className="p-5 rounded-3xl bg-[#FAF7F2] border border-[#E8DFC8]/60">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-1 rounded-2xl bg-white shadow-xs border border-gray-100">
                        <AguAguLogo size="lg" showText={false} customLogoUrl={logoUrlInput || undefined} />
                      </div>
                      <div>
                        <h4 className="text-sm font-heading font-bold text-[#4A4E69] flex items-center gap-2">
                          Logotipo de la Tienda
                          {logoUrlInput ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                              Personalizado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] border border-gray-200 text-[#8C90A4]">
                              Predeterminado
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-[#8C90A4] mt-0.5">
                          Este logotipo se muestra en la barra de navegación, pie de página y mesas públicas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                      <button
                        type="button"
                        id="btn-upload-logo"
                        disabled={isUploadingLogo}
                        onClick={() => logoFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-white border border-[#E2D9CF] text-xs font-bold text-[#4A4E69] hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8B8B]" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-[#FF8B8B]" />
                        )}
                        <span>{logoUrlInput ? 'Cambiar Logotipo' : 'Subir Logotipo'}</span>
                      </button>

                      {logoUrlInput && (
                        <button
                          type="button"
                          id="btn-reset-logo"
                          disabled={isUploadingLogo}
                          onClick={handleResetLogo}
                          className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

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

                {/* Professional WhatsApp Message Preview (Strictly NO EMOJIS) */}
                <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-gray-100 space-y-2">
                  <span className="block text-xs font-bold text-[#4A4A4A]">
                    Vista Previa del Mensaje Formal que Recibirá la Tienda (Sin Emojis):
                  </span>
                  <div className="p-3 bg-white rounded-xl text-xs text-[#2A4D34] font-mono whitespace-pre-line border border-[#E2D9CF]/60 shadow-2xs leading-relaxed">
                    Estimado equipo de {storeNameInput || 'Agu Agu'},{'\n'}
                    {'\n'}
                    Le saluda María Fernández. Deseo confirmar la reserva en tienda física de regalo(s) correspondiente a la siguiente mesa de regalos:{'\n'}
                    {'\n'}
                    Mesa / Evento: Baby Shower Sofía (#mesa/sofia-castro){'\n'}
                    Modalidad: Pago y retiro en tienda física{'\n'}
                    {'\n'}
                    Detalle de regalo(s) seleccionado(s):{'\n'}
                    - Cuna Nórdica de Madera | Cantidad: 1 | Precio: {currencyInput}280.00{'\n'}
                    - Set de Sábanas de Algodón | Cantidad: 1 | Precio: {currencyInput}35.00{'\n'}
                    {'\n'}
                    Total a cancelar en tienda: {currencyInput}315.00{'\n'}
                    Codigo de referencia: TIENDA-L92K-8B{'\n'}
                    {'\n'}
                    Datos de contacto de quien reserva:{'\n'}
                    - Nombre: María Fernández{'\n'}
                    - Telefono: +503 7123-4567{'\n'}
                    {'\n'}
                    Agradezco me confirmen la disponibilidad del pedido y los pasos para presentarme a realizar el pago en tienda.{'\n'}
                    {'\n'}
                    Atentamente,{'\n'}
                    María Fernández
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

          {/* ================================================================= */}
          {/* TAB 5: RESPALDOS REALES DE FIRESTORE (PITR & SCHEDULED BACKUPS) */}
          {/* ================================================================= */}
          {activeTab === 'backups' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Main Banner */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-heading font-bold text-xl text-[#4A4A4A]">
                      Protección y Respaldos Reales de Firestore
                    </h2>
                    <p className="text-xs text-[#8E8D8A]">
                      Capacidades nativas de Google Cloud Firestore para Point-in-Time Recovery y Backups programados
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Respaldo Real de Base de Datos vs. Papelera de la Aplicación
                  </p>
                  <p className="text-emerald-900/90 leading-relaxed">
                    La papelera de mesas en esta app es para la recuperación rápida de mesas eliminadas en el día a día. Los respaldos de Firestore a continuación son la verdadera salvaguarda de infraestructura a nivel de Google Cloud ante incidentes mayores, fallos de software o desastres de base de datos.
                  </p>
                </div>
              </div>

              {/* Grid with PITR and Scheduled Backups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Point-in-Time Recovery (PITR) */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        1. Point-in-Time Recovery (PITR)
                      </span>
                      <span className="text-[11px] font-bold text-blue-700">Hasta 7 días</span>
                    </div>

                    <h3 className="font-heading font-bold text-base text-[#4A4A4A] mb-2">
                      Recuperación a cualquier segundo
                    </h3>
                    <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
                      PITR protege tus datos de Firestore contra escrituras o eliminaciones accidentales continuas. Permite restaurar toda la base de datos a cualquier segundo específico dentro de una ventana de retención de 7 días.
                    </p>

                    <div className="space-y-3 bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8DFC8]/60 text-xs mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8E8D8A] font-semibold">Comando gcloud para habilitar:</span>
                        <button
                          onClick={() =>
                            copyCommandText(
                              "gcloud firestore databases update --database='(default)' --point-in-time-recovery-enable",
                              'pitr-enable'
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700 hover:text-blue-600 hover:border-blue-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          {copiedCommand === 'pitr-enable' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copiar
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto select-all">
                        gcloud firestore databases update --database='(default)' --point-in-time-recovery-enable
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 text-[11px] text-[#8E8D8A]">
                    💡 También puedes activarlo en <strong>Firebase Console &gt; Firestore Database &gt; Configuración</strong>.
                  </div>
                </div>

                {/* 2. Scheduled Backups */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        2. Backups Programados (Schedules)
                      </span>
                      <span className="text-[11px] font-bold text-purple-700">14 días de retención</span>
                    </div>

                    <h3 className="font-heading font-bold text-base text-[#4A4A4A] mb-2">
                      Copias automáticas diarias
                    </h3>
                    <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
                      Programa copias de seguridad automáticas diarias de todas las colecciones de Firestore con retención garantizada de 14 días en la infraestructura de Google Cloud.
                    </p>

                    <div className="space-y-3 bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8DFC8]/60 text-xs mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8E8D8A] font-semibold">Comando gcloud para programar:</span>
                        <button
                          onClick={() =>
                            copyCommandText(
                              "gcloud firestore backups schedules create --database='(default)' --recurrence=DAILY --retention=14d",
                              'schedule-create'
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700 hover:text-purple-600 hover:border-purple-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          {copiedCommand === 'schedule-create' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copiar
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto select-all">
                        gcloud firestore backups schedules create --database='(default)' --recurrence=DAILY --retention=14d
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 text-[11px] text-[#8E8D8A]">
                    💡 Para ver tus backups generados: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">gcloud firestore backups list</code>
                  </div>
                </div>
              </div>

              {/* Disaster Recovery Guide */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <h3 className="font-heading font-bold text-base text-[#4A4A4A] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  Procedimiento de Restauración ante Desastres de Firestore
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <h4 className="font-bold text-[#4A4A4A]">Identificar el Respaldo</h4>
                    <p className="text-[#6B7280] leading-relaxed">
                      Ejecuta <code className="text-blue-600 font-mono">gcloud firestore backups list</code> para obtener el identificador exacto de la copia de seguridad.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <h4 className="font-bold text-[#4A4A4A]">Restaurar Base de Datos</h4>
                    <p className="text-[#6B7280] leading-relaxed">
                      Ejecuta el comando <code className="text-purple-600 font-mono">gcloud firestore databases restore</code> especificando el ID del backup.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <h4 className="font-bold text-[#4A4A4A]">Verificación Inmediata</h4>
                    <p className="text-[#6B7280] leading-relaxed">
                      La app se reconecta automáticamente en tiempo real sin requerir cambios de código ni reinstalación.
                    </p>
                  </div>
                </div>
              </div>
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

      {/* Import Inventory Modal (Excel / CSV) */}
      <ImportInventoryModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(count) => {
          showToast(
            `¡${count} productos importados con éxito! Haz clic en el lápiz (✏️) de cualquier producto para subir sus fotos.`
          );
          getProducts().then(setProducts).catch(console.error);
        }}
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
