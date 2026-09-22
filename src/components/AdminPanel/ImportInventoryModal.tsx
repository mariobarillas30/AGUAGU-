import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Image as ImageIcon,
  Check,
  Trash2,
} from 'lucide-react';
import { Product } from '../../types';
import { addProductsBatch } from '../../services/dbService';

interface ImportInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  currencySymbol?: string;
}

interface ParsedProductRow {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  description: string;
  imageUrl: string;
  hasCustomPhoto: boolean;
  isValid: boolean;
  validationError?: string;
  selected: boolean;
}

export const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80';

const VALID_CATEGORIES = [
  'Habitación',
  'Paseo',
  'Ropa',
  'Alimentación',
  'Higiene',
  'Juguetes',
  'Seguridad',
  'General',
];

export const ImportInventoryModal: React.FC<ImportInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currencySymbol = '$',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [invalidRowsCount, setInvalidRowsCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Progreso de importación
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [importedTotal, setImportedTotal] = useState<number>(0);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setParsedRows([]);
    setInvalidRowsCount(0);
    setErrorMsg(null);
    setImportProgress({ current: 0, total: 0 });
    setImportedTotal(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ---------------------------------------------------------------------------
  // DESCARGA DE PLANTILLA GUÍA EXCEL
  // ---------------------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Nombre: 'Cuna Colecho Multifuncional',
        Precio: 185.0,
        Stock: 10,
        Categoria: 'Habitación',
        Descripcion: 'Cuna con lateral abatible y 6 niveles de altura ajustable.',
        Foto_URL: '',
      },
      {
        Nombre: 'Cochecito Ergonómico Plegable',
        Precio: 135.5,
        Stock: 15,
        Categoria: 'Paseo',
        Descripcion: 'Estructura ultraligera de aluminio con capota extensible y arnés de 5 puntos.',
        Foto_URL: '',
      },
      {
        Nombre: 'Set Biberones Anticólicos x3',
        Precio: 24.99,
        Stock: 30,
        Categoria: 'Alimentación',
        Descripcion: 'Biberones libres de BPA con tetina de silicona suave y sistema anticólicos.',
        Foto_URL: '',
      },
      {
        Nombre: 'Bañera Plegable con Termómetro Digital',
        Precio: 42.0,
        Stock: 12,
        Categoria: 'Higiene',
        Descripcion: 'Bañera compacta antideslizante con sensor térmico integrado.',
        Foto_URL: '',
      },
      {
        Nombre: 'Gimnasio Sensorial para Bebé',
        Precio: 38.0,
        Stock: 20,
        Categoria: 'Juguetes',
        Descripcion: 'Tapete acolchado con arco de juguetes colgantes y melodías suaves.',
        Foto_URL: '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Configurar anchos de columna para legibilidad óptima
    worksheet['!cols'] = [
      { wch: 35 }, // Nombre
      { wch: 12 }, // Precio
      { wch: 10 }, // Stock
      { wch: 18 }, // Categoria
      { wch: 55 }, // Descripcion
      { wch: 40 }, // Foto_URL
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario_AguAgu');

    XLSX.writeFile(workbook, 'plantilla_inventario_aguagu.xlsx');
  };

  // ---------------------------------------------------------------------------
  // PROCESAMIENTO Y PARSEO DEL ARCHIVO EXCEL / CSV
  // ---------------------------------------------------------------------------
  const processFile = async (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('El archivo de Excel no contiene ninguna hoja válida.');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawJson || rawJson.length === 0) {
        throw new Error('La hoja seleccionada está vacía. Agrega al menos un producto con Nombre y Precio.');
      }

      let invalidCount = 0;
      const rows: ParsedProductRow[] = rawJson.map((raw, index) => {
        // Mapeo flexible de nombres de columna (insensible a mayúsculas/minúsculas y acentos)
        const keys = Object.keys(raw);
        const findVal = (possibleNames: string[]): any => {
          for (const key of keys) {
            const cleanKey = key
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');
            for (const name of possibleNames) {
              if (cleanKey === name) return raw[key];
            }
          }
          return '';
        };

        const rawName = String(findVal(['nombre', 'producto', 'name', 'title', 'articulo', 'item']) || '').trim();
        const rawPrice = findVal(['precio', 'price', 'costo', 'valor', 'monto']);
        const rawStock = findVal(['stock', 'cantidad', 'quantity', 'qty', 'inventario', 'disponible']);
        const rawCategory = String(findVal(['categoria', 'category', 'seccion', 'departamento']) || '').trim();
        const rawDesc = String(findVal(['descripcion', 'description', 'detalle', 'detalles', 'desc']) || '').trim();
        const rawPhoto = String(findVal(['fotourl', 'foto', 'imagen', 'image', 'url', 'imageurl', 'fotos']) || '').trim();

        // Limpieza de precio (soporta símbolos de moneda y comas)
        let priceNum = 0;
        if (typeof rawPrice === 'number') {
          priceNum = rawPrice;
        } else if (typeof rawPrice === 'string') {
          const cleaned = rawPrice.replace(/[^0-9.-]/g, '');
          priceNum = parseFloat(cleaned) || 0;
        }

        // Limpieza de stock
        let stockNum = 10;
        if (typeof rawStock === 'number') {
          stockNum = Math.max(0, Math.floor(rawStock));
        } else if (typeof rawStock === 'string' && rawStock.trim() !== '') {
          const parsedStock = parseInt(rawStock.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(parsedStock)) stockNum = parsedStock;
        }

        // Normalización de categoría
        let categoryVal = 'Habitación';
        if (rawCategory) {
          const matchedCat = VALID_CATEGORIES.find(
            (c) => c.toLowerCase() === rawCategory.toLowerCase()
          );
          categoryVal = matchedCat || rawCategory;
        }

        // Validación de fila
        let isValid = true;
        let validationError: string | undefined;

        if (!rawName) {
          isValid = false;
          validationError = 'Falta el nombre del producto';
        } else if (isNaN(priceNum) || priceNum <= 0) {
          isValid = false;
          validationError = 'Precio inválido (debe ser mayor a 0)';
        }

        if (!isValid) invalidCount++;

        const hasCustomPhoto = Boolean(rawPhoto && (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')));
        const finalImageUrl = hasCustomPhoto ? rawPhoto : DEFAULT_FALLBACK_IMAGE;

        return {
          id: `import-${index}-${Date.now()}`,
          name: rawName || `Producto sin nombre (Fila ${index + 2})`,
          price: priceNum,
          quantity: stockNum,
          category: categoryVal,
          description: rawDesc || `Producto para bebé de alta calidad disponible en tienda oficial.`,
          imageUrl: finalImageUrl,
          hasCustomPhoto,
          isValid,
          validationError,
          selected: isValid,
        };
      });

      setParsedRows(rows);
      setInvalidRowsCount(invalidCount);
      setStep('preview');
    } catch (err: any) {
      console.error('Error procesando archivo Excel:', err);
      setErrorMsg(err?.message || 'No se pudo leer el archivo Excel. Asegúrate de que sea un archivo .xlsx, .xls o .csv válido.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Alternar selección de una fila
  const toggleRowSelection = (id: string) => {
    setParsedRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row))
    );
  };

  // Seleccionar o deseleccionar todas las válidas
  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((row) => (row.isValid ? { ...row, selected: select } : row))
    );
  };

  // ---------------------------------------------------------------------------
  // EJECUCIÓN DE LA IMPORTACIÓN A FIRESTORE
  // ---------------------------------------------------------------------------
  const handleConfirmImport = async () => {
    const selectedRows = parsedRows.filter((r) => r.isValid && r.selected);
    if (selectedRows.length === 0) {
      setErrorMsg('No hay productos válidos seleccionados para importar.');
      return;
    }

    setStep('importing');
    setImportProgress({ current: 0, total: selectedRows.length });

    try {
      const productsToAdd: Omit<Product, 'id'>[] = selectedRows.map((row) => ({
        name: row.name,
        description: row.description,
        price: row.price,
        quantity: row.quantity,
        category: row.category,
        imageUrl: row.imageUrl,
        images: [row.imageUrl],
      }));

      const result = await addProductsBatch(productsToAdd, (processed, total) => {
        setImportProgress({ current: processed, total });
      });

      setImportedTotal(result.addedCount);
      setStep('completed');
      onSuccess(result.addedCount);
    } catch (err: any) {
      console.error('Error durante importación a Firestore:', err);
      setErrorMsg(
        err?.message ||
          'Ocurrió un error al guardar los productos en la base de datos. Revisa tu conexión.'
      );
      setStep('preview');
    }
  };

  const selectedCount = parsedRows.filter((r) => r.isValid && r.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0F2F1] text-[#00897B] flex items-center justify-center font-bold shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-[#4A4A4A]">
                Importar Inventario desde Excel / CSV
              </h2>
              <p className="text-xs text-[#8E8D8A]">
                Carga masiva de productos con edición posterior de fotografías
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-[#8E8D8A] hover:text-[#4A4A4A] hover:bg-gray-100 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#FDFBF7]/40">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 1: SUBIDA DEL ARCHIVO */}
          {/* ================================================================= */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Banner Descargar Plantilla */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#B2DFDB]/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2F1] text-[#00897B]">
                    Plantilla Recomendada
                  </span>
                  <h3 className="font-bold text-sm text-[#4A4A4A]">
                    ¿No tienes un archivo preparado?
                  </h3>
                  <p className="text-xs text-[#8E8D8A] max-w-md">
                    Descarga nuestra plantilla oficial en Excel con las columnas listas y ejemplos de productos para bebé.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 rounded-xl bg-[#00897B] text-white text-xs font-bold hover:bg-[#00796B] transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Descargar Plantilla Excel (.xlsx)
                </button>
              </div>

              {/* Zona Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#00897B] bg-[#E0F2F1]/30 scale-[1.01]'
                    : 'border-gray-200 bg-white hover:border-[#00897B]/60 hover:bg-[#FAF7F2]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-3xl bg-[#E0F2F1] text-[#00897B] flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h3 className="font-heading font-bold text-base text-[#4A4A4A] mb-1">
                  Arrastra tu archivo Excel o CSV aquí
                </h3>
                <p className="text-xs text-[#8E8D8A] max-w-sm mx-auto mb-4">
                  Soporta formatos <span className="font-semibold text-[#4A4A4A]">.xlsx</span>,{' '}
                  <span className="font-semibold text-[#4A4A4A]">.xls</span> o{' '}
                  <span className="font-semibold text-[#4A4A4A]">.csv</span>
                </p>

                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-[#00897B] shadow-2xs hover:bg-[#FDFBF7]">
                  Explorar Archivos en tu Computadora
                </span>
              </div>

              {/* Pasos / Guía de funcionamiento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="w-6 h-6 rounded-full bg-[#E0F2F1] text-[#00897B] text-xs font-extrabold flex items-center justify-center mb-2">
                    1
                  </span>
                  <h4 className="font-bold text-xs text-[#4A4A4A] mb-1">Carga Masiva</h4>
                  <p className="text-[11px] text-[#8E8D8A] leading-relaxed">
                    Sube decenas o cientos de productos con sus precios y stock en un solo clic.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="w-6 h-6 rounded-full bg-[#FFEAA7] text-[#B76E00] text-xs font-extrabold flex items-center justify-center mb-2">
                    2
                  </span>
                  <h4 className="font-bold text-xs text-[#4A4A4A] mb-1">Fotos Automáticas</h4>
                  <p className="text-[11px] text-[#8E8D8A] leading-relaxed">
                    Si el Excel no tiene fotos, se asigna una provisional para que el producto quede activo de inmediato.
                  </p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="w-6 h-6 rounded-full bg-[#FF8B8B]/20 text-[#FF8B8B] text-xs font-extrabold flex items-center justify-center mb-2">
                    3
                  </span>
                  <h4 className="font-bold text-xs text-[#4A4A4A] mb-1">Edición Visual</h4>
                  <p className="text-[11px] text-[#8E8D8A] leading-relaxed">
                    Luego entras a editar cada producto para subir sus fotos reales con la cámara o galería.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 2: VISTA PREVIA Y VALIDACIÓN */}
          {/* ================================================================= */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Barra superior de resumen */}
              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-xs text-[#4A4A4A]">{fileName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2F1] text-[#00897B]">
                      {parsedRows.length} productos detectados
                    </span>
                  </div>
                  <p className="text-xs text-[#8E8D8A]">
                    {selectedCount} seleccionados para importar •{' '}
                    {parsedRows.filter((r) => r.hasCustomPhoto).length} con foto en hoja •{' '}
                    {parsedRows.filter((r) => !r.hasCustomPhoto && r.isValid).length} listos para editar fotos
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#00897B] hover:bg-[#E0F2F1] rounded-lg transition-colors cursor-pointer"
                  >
                    Seleccionar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#8E8D8A] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Desmarcar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {invalidRowsCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Se omitirán <strong className="font-bold">{invalidRowsCount} fila(s)</strong> por no tener nombre o tener precio inválido.
                  </span>
                </div>
              )}

              {/* Tabla interactiva de vista previa */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#FAF7F2] text-[#5D5C5B] font-bold border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <Check className="w-3.5 h-3.5 mx-auto text-[#00897B]" />
                      </th>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Precio</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Estado de Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          !row.isValid
                            ? 'bg-red-50/50 text-gray-400'
                            : row.selected
                            ? 'hover:bg-[#E0F2F1]/20'
                            : 'opacity-50 hover:opacity-80 bg-gray-50/50'
                        }`}
                      >
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRowSelection(row.id)}
                              className="w-4 h-4 rounded text-[#00897B] focus:ring-[#00897B] cursor-pointer"
                            />
                          ) : (
                            <span title={row.validationError}>
                              <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-[#4A4A4A] line-clamp-1">{row.name}</div>
                          {row.description && (
                            <div className="text-[11px] text-[#8E8D8A] line-clamp-1">
                              {row.description}
                            </div>
                          )}
                          {!row.isValid && (
                            <div className="text-[10px] text-red-500 font-bold mt-0.5">
                              {row.validationError}
                            </div>
                          )}
                        </td>

                        <td className="p-3 font-bold text-[#FF8B8B] whitespace-nowrap">
                          {currencySymbol}
                          {row.price.toFixed(2)}
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                            {row.quantity}
                          </span>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] text-[#5D5C5B] border border-gray-100">
                            {row.category}
                          </span>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          {row.hasCustomPhoto ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3 h-3" /> Con foto URL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFEAA7]/60 text-[#B76E00] border border-[#FFEAA7]">
                              <ImageIcon className="w-3 h-3" /> Editar foto luego
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 3: EN PROGRESO DE IMPORTACIÓN */}
          {/* ================================================================= */}
          {step === 'importing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#E0F2F1] text-[#00897B] flex items-center justify-center mx-auto shadow-xs">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#4A4A4A]">
                Importando productos al catálogo...
              </h3>
              <p className="text-xs text-[#8E8D8A] max-w-sm mx-auto">
                Guardando registros en el catálogo de la tienda de forma segura.
              </p>

              <div className="max-w-xs mx-auto space-y-1.5 pt-2">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00897B] transition-all duration-300 rounded-full"
                    style={{
                      width: `${
                        importProgress.total > 0
                          ? Math.round((importProgress.current / importProgress.total) * 100)
                          : 15
                      }%`,
                    }}
                  />
                </div>
                <div className="text-[11px] font-bold text-[#5D5C5B]">
                  {importProgress.current} de {importProgress.total} productos
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASO 4: IMPORTACIÓN COMPLETADA */}
          {/* ================================================================= */}
          {step === 'completed' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h3 className="font-heading font-bold text-xl text-[#4A4A4A]">
                ¡Importación completada con éxito!
              </h3>

              <p className="text-xs text-[#5D5C5B] max-w-md mx-auto leading-relaxed">
                Se agregaron <strong className="text-green-700 font-extrabold">{importedTotal} productos</strong> correctamente al inventario general de la tienda.
              </p>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-gray-200 text-left max-w-md mx-auto space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A4A4A]">
                  <ImageIcon className="w-4 h-4 text-[#00897B]" />
                  <span>¿Cómo editar las fotos ahora?</span>
                </div>
                <p className="text-[11px] text-[#8E8D8A] leading-relaxed">
                  En la pestaña de <strong>Inventario</strong>, haz clic en el ícono de lápiz (✏️) en cualquiera de los productos que acabas de subir. Podrás subir una o múltiples fotos reales directamente desde tu computadora o celular.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-[#00897B] text-white text-xs font-bold hover:bg-[#00796B] transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                Seleccionar Archivo Excel / CSV
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Atrás
              </button>

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-xl bg-[#00897B] text-white text-xs font-bold hover:bg-[#00796B] transition-all flex items-center gap-2 shadow-md shadow-teal-200/50 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Confirmar e Importar {selectedCount} Productos
              </button>
            </>
          )}

          {step === 'importing' && (
            <div className="w-full text-center text-xs text-[#8E8D8A] font-medium py-1">
              Por favor no cierres esta ventana mientras se completa la carga...
            </div>
          )}

          {step === 'completed' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-[#00897B] text-white text-xs font-bold hover:bg-[#00796B] transition-all flex items-center gap-2 shadow-md shadow-teal-200/50 cursor-pointer active:scale-95"
              >
                Ir al Inventario para Editar Fotos
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
