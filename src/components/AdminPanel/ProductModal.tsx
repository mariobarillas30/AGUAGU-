import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
  Star,
  Layers,
  Palette,
  Eye,
  Upload,
  Loader2,
  CloudUpload,
} from 'lucide-react';
import { Product, ExtraProduct } from '../../types';
import {
  uploadProductImageToStorage,
  deleteImageFromStorageByUrl,
  dataUrlToBlob,
} from '../../services/storageService';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Product | ExtraProduct | null;
  mode: 'inventory' | 'extra';
  currencySymbol?: string;
}

interface ImageItem {
  id: string;
  url: string; // URL remota existente o Blob URL local para preview
  file?: File; // Archivo local nuevo pendiente de subida
  isNew: boolean;
  status?: 'pending' | 'uploading' | 'completed' | 'error';
  progressPercent?: number;
}

const CATEGORIES = [
  'Habitación',
  'Paseo',
  'Ropa',
  'Alimentación',
  'Higiene',
  'Juguetes',
  'Seguridad',
  'General',
];

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80';

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
  currencySymbol = '$',
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [category, setCategory] = useState('Habitación');
  const [badge, setBadge] = useState('Favorito');

  // Multi-image management state
  const [images, setImages] = useState<ImageItem[]>([]);
  const [originalRemoteImages, setOriginalRemoteImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setPrice(initialData.price || '');

      // Determine initial images list
      let rawUrls: string[] = [];
      if (initialData.images && initialData.images.length > 0) {
        rawUrls = [...initialData.images];
      } else if (initialData.imageUrl) {
        rawUrls = [initialData.imageUrl];
      } else {
        rawUrls = [DEFAULT_FALLBACK_IMAGE];
      }

      setOriginalRemoteImages(rawUrls);
      setImages(
        rawUrls.map((url, idx) => ({
          id: `orig-${idx}-${Date.now()}`,
          url,
          isNew: false,
        }))
      );
      setActiveImageIndex(0);

      if (mode === 'inventory') {
        setQuantity((initialData as Product).quantity ?? 10);
        setCategory((initialData as Product).category || 'Habitación');
      } else {
        setBadge((initialData as ExtraProduct).badge || 'Favorito');
      }
    } else {
      // Default new product values
      setName('');
      setDescription('');
      setPrice('');
      setQuantity(10);
      setOriginalRemoteImages([]);
      setImages([
        {
          id: `default-${Date.now()}`,
          url: DEFAULT_FALLBACK_IMAGE,
          isNew: false,
        },
      ]);
      setActiveImageIndex(0);
      setCategory('Habitación');
      setBadge('Favorito');
    }
    setErrorMsg(null);
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  // Process files from file picker or drag-drop
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const newItems: ImageItem[] = [];
    Array.from(files).forEach((file) => {
      console.log('[PRODUCT IMAGE] Seleccionada:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const isImage =
        (file.type && file.type.startsWith('image/')) ||
        /\.(jpe?g|png|webp|avif|gif|bmp|svg|heic)$/i.test(file.name);

      if (!isImage) {
        setErrorMsg(`"${file.name}" no es un archivo de imagen compatible (JPG, PNG, WebP, AVIF).`);
        return;
      }

      if (file.size > 30 * 1024 * 1024) {
        setErrorMsg(`La imagen ${file.name} supera el tamaño máximo permitido de 30MB.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url: previewUrl,
        file,
        isNew: true,
        status: 'pending',
        progressPercent: 0,
      });
    });

    if (newItems.length > 0) {
      setImages((prev) => {
        // If the only image is the default placeholder, replace it
        if (prev.length === 1 && prev[0].url === DEFAULT_FALLBACK_IMAGE && !prev[0].file) {
          return newItems;
        }
        return [...prev, ...newItems];
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      const dataTransfer = new DataTransfer();
      files.forEach((f) => dataTransfer.items.add(f));
      handleFiles(dataTransfer.files);
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    setErrorMsg(null);

    const splitUrls = trimmed
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const urlItems: ImageItem[] = splitUrls.map((url, idx) => ({
      id: `url-${Date.now()}-${idx}`,
      url,
      isNew: false,
    }));

    setImages((prev) => {
      if (prev.length === 1 && prev[0].url === DEFAULT_FALLBACK_IMAGE && !prev[0].file) {
        return urlItems;
      }
      return [...prev, ...urlItems];
    });
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      return updated.length > 0
        ? updated
        : [
            {
              id: `fallback-${Date.now()}`,
              url: DEFAULT_FALLBACK_IMAGE,
              isNew: false,
            },
          ];
    });
    if (activeImageIndex >= images.length - 1) {
      setActiveImageIndex(Math.max(0, images.length - 2));
    }
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const item = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [item, ...rest];
    });
    setActiveImageIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;

    setIsSaving(true);
    setErrorMsg(null);
    setUploadProgressText('Iniciando procesamiento...');

    try {
      const targetProductId =
        initialData?.id ||
        `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isExtra = mode === 'extra';

      // 1. Subir archivos nuevos a Firebase Storage
      const finalUrls: string[] = [];
      const newImagesToUpload = images.filter((img) => img.file || img.url.startsWith('data:image/'));
      let uploadedCount = 0;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        if (img.file) {
          uploadedCount++;
          // Marcar en UI como en subida
          setImages((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'uploading', progressPercent: 10 } : item
            )
          );

          const uploadedUrl = await uploadProductImageToStorage(
            img.file,
            targetProductId,
            `${name}_${i + 1}`,
            isExtra,
            (progress) => {
              setUploadProgressText(
                `Fotografía ${uploadedCount} de ${newImagesToUpload.length}: ${progress.message}`
              );
              setImages((prev) =>
                prev.map((item, idx) =>
                  idx === i ? { ...item, progressPercent: progress.percent } : item
                )
              );
            }
          );

          finalUrls.push(uploadedUrl);

          // Actualizar estado del ítem a completado y con su URL definitiva de Firebase Storage
          setImages((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    url: uploadedUrl,
                    isNew: false,
                    status: 'completed',
                    progressPercent: 100,
                  }
                : item
            )
          );
        } else if (img.url.startsWith('data:image/')) {
          uploadedCount++;
          setImages((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'uploading', progressPercent: 10 } : item
            )
          );

          const { blob } = dataUrlToBlob(img.url);
          const uploadedUrl = await uploadProductImageToStorage(
            blob,
            targetProductId,
            `${name}_${i + 1}`,
            isExtra,
            (progress) => {
              setUploadProgressText(
                `Fotografía ${uploadedCount} de ${newImagesToUpload.length}: ${progress.message}`
              );
              setImages((prev) =>
                prev.map((item, idx) =>
                  idx === i ? { ...item, progressPercent: progress.percent } : item
                )
              );
            }
          );

          finalUrls.push(uploadedUrl);

          setImages((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    url: uploadedUrl,
                    isNew: false,
                    status: 'completed',
                    progressPercent: 100,
                  }
                : item
            )
          );
        } else if (img.url.trim().length > 0) {
          // URL remota preexistente (Firebase Storage o externa)
          finalUrls.push(img.url.trim());
        }
      }

      const validUrls = finalUrls.length > 0 ? finalUrls : [DEFAULT_FALLBACK_IMAGE];
      const primaryUrl = validUrls[0];

      // 2. Eliminar de Firebase Storage las fotografías que el usuario borró en la edición
      if (originalRemoteImages.length > 0) {
        const removedUrls = originalRemoteImages.filter(
          (origUrl) => !validUrls.includes(origUrl)
        );
        // Borrado en segundo plano de archivos huérfanos
        for (const remUrl of removedUrls) {
          deleteImageFromStorageByUrl(remUrl).catch((delErr) =>
            console.warn('Aviso borrando imagen huérfana de Storage:', delErr)
          );
        }
      }

      // 3. Guardar en Firestore una vez que todas las imágenes están subidas y con URL confirmada
      setUploadProgressText('Guardando información del producto en Firestore...');
      console.log('[PRODUCT IMAGE] Guardando producto en Firestore...');

      if (mode === 'inventory') {
        await onSave({
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          quantity: Number(quantity) || 0,
          imageUrl: primaryUrl,
          images: validUrls,
          category,
        });
      } else {
        await onSave({
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          imageUrl: primaryUrl,
          images: validUrls,
          badge,
        });
      }

      console.log('[PRODUCT IMAGE] Producto guardado en Firestore');
      console.log('[PRODUCT IMAGE] Proceso completado exitosamente');

      // Cerrar el modal únicamente después de confirmar que Firestore guardó el producto
      onClose();
    } catch (err: any) {
      console.error('[PRODUCT IMAGE ERROR] Error al procesar producto:', err);
      setErrorMsg(
        err?.message ||
          'Error al subir fotografías a Firebase Storage o guardar en Firestore. Verifica tu conexión.'
      );

      // Marcar los ítems en fallo para retroalimentación visual
      setImages((prev) =>
        prev.map((item) =>
          item.status === 'uploading' ? { ...item, status: 'error' } : item
        )
      );
    } finally {
      // Garantizar SIEMPRE que isSaving se restablece a false
      setIsSaving(false);
      setUploadProgressText('');
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#F2EAE0] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-[#FAF7F2] border-b border-[#F2EAE0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E58C8A]/15 text-[#E58C8A] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl text-[#4A4E69]">
                {initialData
                  ? 'Editar Producto'
                  : mode === 'inventory'
                  ? 'Nuevo Producto de Inventario'
                  : 'Nuevo Producto Extra'}
              </h3>
              <p className="text-xs text-[#8C90A4]">
                {mode === 'inventory'
                  ? 'Almacena datos en Firestore y fotografías en Firebase Storage'
                  : 'Producto complementario visible al final de las mesas'}
              </p>
            </div>
          </div>
          <button
            id="close-product-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full bg-white border border-[#E8DFC8] text-[#8C90A4] hover:text-[#4A4E69] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error en la operación:</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[#6C7086] mb-1">
              Nombre del Producto *
            </label>
            <input
              id="product-name-input"
              type="text"
              required
              disabled={isSaving}
              placeholder="Ej: Cuna Corral 2 Niveles con Cambiador"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#6C7086] mb-1">
              Descripción & Características
            </label>
            <textarea
              id="product-desc-input"
              rows={2}
              disabled={isSaving}
              placeholder="Detalles sobre materiales, colores disponibles, funciones y edad recomendada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] resize-none disabled:opacity-50"
            />
          </div>

          {/* Pricing & Stock / Badge */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#6C7086] mb-1">
                Precio ({currencySymbol}) *
              </label>
              <input
                id="product-price-input"
                type="number"
                step="0.01"
                min="0"
                required
                disabled={isSaving}
                placeholder="Ej: 85.00"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] disabled:opacity-50"
              />
            </div>

            {mode === 'inventory' ? (
              <div>
                <label className="block text-xs font-bold text-[#6C7086] mb-1">
                  Cantidad en Stock *
                </label>
                <input
                  id="product-quantity-input"
                  type="number"
                  min="0"
                  required
                  disabled={isSaving}
                  placeholder="Ej: 10"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] disabled:opacity-50"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-[#6C7086] mb-1">
                  Etiqueta / Distintivo
                </label>
                <select
                  id="product-badge-select"
                  value={badge}
                  disabled={isSaving}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] disabled:opacity-50"
                >
                  <option value="Favorito">⭐ Favorito para regalar</option>
                  <option value="Esencial">🍼 Esencial de recién nacido</option>
                  <option value="Detalle tierno">🧸 Detalle tierno</option>
                  <option value="Empaque de regalo">🎀 Empaque especial</option>
                </select>
              </div>
            )}
          </div>

          {mode === 'inventory' && (
            <div>
              <label className="block text-xs font-bold text-[#6C7086] mb-1">
                Categoría
              </label>
              <select
                id="product-category-select"
                value={category}
                disabled={isSaving}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] disabled:opacity-50"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ============================================================= */}
          {/* MULTI-IMAGE MANAGEMENT (Firebase Storage + Firestore URLs) */}
          {/* ============================================================= */}
          <div className="pt-3 border-t border-[#F2EAE0]">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <label className="block text-xs font-bold text-[#4A4E69] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#E58C8A]" />
                  Fotografías en Firebase Storage ({images.length}{' '}
                  {images.length === 1 ? 'foto' : 'fotos'})
                </label>
                <span className="text-[11px] text-[#8C90A4]">
                  Las fotos se optimizan y guardan en Storage; Firestore solo guarda sus URLs.
                </span>
              </div>
            </div>

            {/* Main Preview and Image Thumbnails */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFC8]">
              {/* Primary Active Image Preview */}
              <div className="sm:col-span-1">
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#E58C8A] bg-white shadow-2xs">
                  <img
                    src={images[activeImageIndex]?.url || images[0]?.url || DEFAULT_FALLBACK_IMAGE}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-bold flex items-center gap-1">
                    <Eye className="w-3 h-3 text-[#A8D8EA]" />
                    Foto {activeImageIndex + 1}
                  </div>
                  {activeImageIndex === 0 && (
                    <div className="absolute bottom-1.5 inset-x-1.5 bg-[#E58C8A] text-white text-[10px] font-bold py-0.5 text-center rounded-md">
                      ★ Portada Principal
                    </div>
                  )}
                  {images[activeImageIndex]?.isNew && (
                    <div
                      className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-white text-[9px] font-bold shadow-xs ${
                        images[activeImageIndex]?.status === 'uploading'
                          ? 'bg-amber-500 animate-pulse'
                          : images[activeImageIndex]?.status === 'error'
                          ? 'bg-red-600'
                          : images[activeImageIndex]?.status === 'completed'
                          ? 'bg-emerald-600'
                          : 'bg-blue-600'
                      }`}
                    >
                      {images[activeImageIndex]?.status === 'uploading'
                        ? `Subiendo ${images[activeImageIndex]?.progressPercent || 0}%`
                        : images[activeImageIndex]?.status === 'error'
                        ? 'Error al subir'
                        : images[activeImageIndex]?.status === 'completed'
                        ? '✓ En Storage'
                        : 'Pendiente Storage'}
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnails list with management controls */}
              <div className="sm:col-span-2 flex flex-col justify-between">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                  {images.map((imgItem, idx) => (
                    <div
                      key={imgItem.id}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${
                        activeImageIndex === idx
                          ? 'border-[#E58C8A] ring-2 ring-[#F7C8D0]'
                          : 'border-white bg-white hover:border-[#A8D8EA]'
                      }`}
                    >
                      <img
                        src={imgItem.url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <div
                          className="absolute top-1 left-1 bg-[#E58C8A] text-white rounded-full p-0.5 shadow-xs z-10"
                          title="Foto Principal"
                        >
                          <Star className="w-2.5 h-2.5 fill-white" />
                        </div>
                      )}

                      {imgItem.isNew && (
                        <div
                          className={`absolute bottom-1 right-1 text-white text-[8px] font-bold px-1 rounded shadow-2xs z-10 ${
                            imgItem.status === 'uploading'
                              ? 'bg-amber-500 animate-pulse'
                              : imgItem.status === 'completed'
                              ? 'bg-emerald-600'
                              : imgItem.status === 'error'
                              ? 'bg-red-600'
                              : 'bg-blue-600'
                          }`}
                        >
                          {imgItem.status === 'uploading'
                            ? `${imgItem.progressPercent || 0}%`
                            : imgItem.status === 'completed'
                            ? '✓'
                            : imgItem.status === 'error'
                            ? '!'
                            : 'Pendiente'}
                        </div>
                      )}

                      {/* Action hover buttons */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimary(idx);
                            }}
                            className="p-1 rounded-md bg-white/90 text-[#4A4E69] hover:text-[#E58C8A] text-[9px] font-bold shadow-xs cursor-pointer"
                            title="Hacer Portada Principal"
                          >
                            <Star className="w-3 h-3 text-[#E6B875]" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="p-1 rounded-md bg-red-500 text-white text-[9px] font-bold shadow-xs cursor-pointer"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-[#E8DFC8] flex items-center justify-between text-[11px] text-[#6C7086]">
                  <span>
                    Pasa el cursor sobre una foto para marcarla como{' '}
                    <strong>Portada</strong> o <strong>Eliminarla</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Upload Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => !isSaving && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all mb-3 ${
                isDragging
                  ? 'border-[#FF8B8B] bg-[#FFF0F0]'
                  : 'border-[#E2D9CF] bg-[#FAF7F2] hover:border-[#FF8B8B] hover:bg-white'
              } ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.gif,.heic"
                className="hidden"
                disabled={isSaving}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#FF8B8B]/10 text-[#FF8B8B] flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#4A4E69]">
                    Haz clic aquí o arrastra las fotos de tu producto
                  </p>
                  <p className="text-[10px] text-[#8C90A4] mt-0.5">
                    Formatos JPG, PNG, WebP (alta resolución con optimización automática)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isSaving}
                  className="mt-1 px-4 py-1.5 rounded-xl bg-white border border-[#FF8B8B] text-[#FF8B8B] hover:bg-[#FF8B8B] hover:text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Elegir fotos desde este equipo</span>
                </button>
              </div>
            </div>

            {/* Input to add more images via URL */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-4 h-4 text-[#A0A4B8] absolute left-3.5 top-3" />
                <input
                  id="product-new-image-url-input"
                  type="url"
                  disabled={isSaving}
                  placeholder="O pega una URL de imagen (https://...)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                id="btn-add-image-url"
                onClick={handleAddImageUrl}
                disabled={isSaving || !newImageUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9CF] text-[#4A4E69] hover:bg-[#E58C8A] hover:text-white hover:border-[#E58C8A] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Enlace</span>
              </button>
            </div>
          </div>

          {/* Action Buttons & Progress state */}
          <div className="pt-4 border-t border-[#F2EAE0] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#6C7086] flex items-center gap-2">
              {isSaving && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#E58C8A]" />
                  <span className="font-semibold text-[#E58C8A]">
                    {uploadProgressText || 'Guardando cambios...'}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                id="cancel-product-modal-btn"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl border border-[#E2D9CF] text-[#6C7086] text-xs font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="save-product-modal-btn"
                disabled={isSaving || !name.trim() || price === ''}
                className="px-6 py-2.5 rounded-xl bg-[#E58C8A] text-white text-xs font-bold hover:bg-[#d67b79] transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSaving ? (
                  <>
                    <CloudUpload className="w-4 h-4 animate-pulse" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Guardar Producto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
