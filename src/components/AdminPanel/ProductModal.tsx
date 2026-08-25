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
  FolderOpen,
} from 'lucide-react';
import { Product, ExtraProduct } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Product | ExtraProduct | null;
  mode: 'inventory' | 'extra';
  currencySymbol?: string;
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
  const [imageList, setImageList] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setPrice(initialData.price || '');

      // Determine initial images list
      let imgs: string[] = [];
      if (initialData.images && initialData.images.length > 0) {
        imgs = [...initialData.images];
      } else if (initialData.imageUrl) {
        imgs = [initialData.imageUrl];
      } else {
        imgs = [DEFAULT_FALLBACK_IMAGE];
      }
      setImageList(imgs);
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
      setImageList([DEFAULT_FALLBACK_IMAGE]);
      setActiveImageIndex(0);
      setCategory('Habitación');
      setBadge('Favorito');
    }
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  // Process files from file picker or drag-drop
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setImageList((prev) => {
            // If the only image is the default placeholder, replace it
            if (prev.length === 1 && prev[0] === DEFAULT_FALLBACK_IMAGE) {
              return [result];
            }
            return [...prev, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;

    const splitUrls = trimmed
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    setImageList((prev) => {
      if (prev.length === 1 && prev[0] === DEFAULT_FALLBACK_IMAGE) {
        return [...splitUrls];
      }
      return [...prev, ...splitUrls];
    });
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageList((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      return updated.length > 0 ? updated : [DEFAULT_FALLBACK_IMAGE];
    });
    if (activeImageIndex >= imageList.length - 1) {
      setActiveImageIndex(Math.max(0, imageList.length - 2));
    }
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setImageList((prev) => {
      const item = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [item, ...rest];
    });
    setActiveImageIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;

    const validImages = imageList.filter((img) => img.trim().length > 0);
    const primaryImg = validImages[0] || DEFAULT_FALLBACK_IMAGE;

    setIsSaving(true);
    try {
      if (mode === 'inventory') {
        await onSave({
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          quantity: Number(quantity) || 0,
          imageUrl: primaryImg,
          images: validImages,
          category,
        });
      } else {
        await onSave({
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          imageUrl: primaryImg,
          images: validImages,
          badge,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
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
                  ? 'Gestiona especificaciones, fotos del producto y colores'
                  : 'Producto complementario visible al final de las mesas'}
              </p>
            </div>
          </div>
          <button
            id="close-product-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E8DFC8] text-[#8C90A4] hover:text-[#4A4E69] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              placeholder="Ej: Cuna Corral 2 Niveles con Cambiador"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
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
              placeholder="Detalles sobre materiales, colores disponibles, funciones y edad recomendada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA] resize-none"
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
                placeholder="Ej: 85.00"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
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
                  placeholder="Ej: 10"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
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
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
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
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-sm text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
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
          {/* MULTI-IMAGE MANAGEMENT (Fotos, Vistas y Colores) */}
          {/* ============================================================= */}
          <div className="pt-3 border-t border-[#F2EAE0]">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <label className="block text-xs font-bold text-[#4A4E69] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#E58C8A]" />
                  Fotos del Producto ({imageList.length}{' '}
                  {imageList.length === 1 ? 'foto' : 'fotos'})
                </label>
                <span className="text-[11px] text-[#8C90A4]">
                  Sube fotos desde tu dispositivo o agrega enlaces web
                </span>
              </div>
            </div>

            {/* Main Preview and Image Thumbnails */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8DFC8]">
              {/* Primary Active Image Preview */}
              <div className="sm:col-span-1">
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#E58C8A] bg-white shadow-2xs">
                  <img
                    src={imageList[activeImageIndex] || imageList[0]}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-bold flex items-center gap-1">
                    <Eye className="w-3 h-3 text-[#A8D8EA]" />
                    Foto {activeImageIndex + 1}
                  </div>
                  {activeImageIndex === 0 && (
                    <div className="absolute bottom-1.5 inset-x-1.5 bg-[#E58C8A] text-white text-[10px] font-bold py-0.5 text-center rounded-md">
                      ★ Foto Portada Principal
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnails list with management controls */}
              <div className="sm:col-span-2 flex flex-col justify-between">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                  {imageList.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${
                        activeImageIndex === idx
                          ? 'border-[#E58C8A] ring-2 ring-[#F7C8D0]'
                          : 'border-white bg-white hover:border-[#A8D8EA]'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <div
                          className="absolute top-1 left-1 bg-[#E58C8A] text-white rounded-full p-0.5"
                          title="Foto Principal"
                        >
                          <Star className="w-2.5 h-2.5 fill-white" />
                        </div>
                      )}

                      {/* Action hover buttons */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
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
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all mb-3 ${
                isDragging
                  ? 'border-[#FF8B8B] bg-[#FFF0F0]'
                  : 'border-[#E2D9CF] bg-[#FAF7F2] hover:border-[#FF8B8B] hover:bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-[#FF8B8B]/10 text-[#FF8B8B] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-[#4A4E69]">
                  Haz clic para subir fotos desde tu dispositivo o arrástralas aquí
                </p>
                <p className="text-[10px] text-[#8C90A4]">
                  Formatos soportados: JPG, PNG, WEBP (puedes seleccionar varias a la vez)
                </p>
              </div>
            </div>

            {/* Input to add more images via URL */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ImageIcon className="w-4 h-4 text-[#A0A4B8] absolute left-3.5 top-3" />
                <input
                  id="product-new-image-url-input"
                  type="url"
                  placeholder="O pega una URL de imagen (https://...)"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageUrl();
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2D9CF] bg-[#FAF7F2] text-xs text-[#4A4E69] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
                />
              </div>
              <button
                type="button"
                id="btn-add-image-url"
                onClick={handleAddImageUrl}
                disabled={!newImageUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9CF] text-[#4A4E69] hover:bg-[#E58C8A] hover:text-white hover:border-[#E58C8A] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Enlace</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#F2EAE0] flex items-center justify-end gap-3">
            <button
              type="button"
              id="cancel-product-modal-btn"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#E2D9CF] text-[#6C7086] text-xs font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="save-product-modal-btn"
              disabled={isSaving || !name.trim() || price === ''}
              className="px-6 py-2.5 rounded-xl bg-[#E58C8A] text-white text-xs font-bold hover:bg-[#d67b79] transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Check className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
