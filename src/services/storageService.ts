import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from '../firebase/config';

export interface ProcessedImageResult {
  url: string;
  isNewUpload: boolean;
}

/**
 * Verifica si una URL corresponde a un archivo alojado en Firebase Storage
 */
export function isFirebaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('firebasestorage.app') ||
    url.includes('aguagu-3baf3.appspot.com')
  );
}

/**
 * Comprime y redimensiona una imagen en el navegador del cliente antes de subirla
 * a Firebase Storage. Reduce el peso entre un 70% y 90% minimizando costos de ancho de banda.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  // Validación de tipo MIME
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al procesar los datos de la imagen.'));
      img.onload = () => {
        try {
          let { width, height } = img;

          // Calcular redimensionamiento manteniendo relación de aspecto
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback si no hay soporte de canvas 2D
            resolve({ blob: file, mimeType: file.type, extension: 'jpg' });
            return;
          }

          // Dibujar con suavizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Determinar formato preferido (WebP si está soportado, de lo contrario JPEG)
          const targetMime = 'image/webp';
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, mimeType: targetMime, extension: 'webp' });
              } else {
                // Fallback a JPEG
                canvas.toBlob(
                  (jpegBlob) => {
                    if (jpegBlob) {
                      resolve({ blob: jpegBlob, mimeType: 'image/jpeg', extension: 'jpg' });
                    } else {
                      resolve({ blob: file, mimeType: file.type, extension: 'jpg' });
                    }
                  },
                  'image/jpeg',
                  quality
                );
              }
            },
            targetMime,
            quality
          );
        } catch (err) {
          console.warn('Fallo en compresión de canvas, usando archivo original:', err);
          resolve({ blob: file, mimeType: file.type, extension: 'jpg' });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convierte un Data URL (base64) a un objeto File o Blob para subida directa
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return { blob: new Blob([u8arr], { type: mimeType }), mimeType };
}

/**
 * Sube una fotografía optimizada a Firebase Storage en la ruta ordenada:
 * `products/{productId}/{timestamp}_{nombreArchivo}.webp`
 */
export async function uploadProductImageToStorage(
  fileOrBlob: File | Blob,
  productId: string,
  suggestedName = 'foto',
  isExtra = false
): Promise<string> {
  const folder = isExtra ? 'extra_products' : 'products';
  
  let uploadBlob: Blob = fileOrBlob;
  let mimeType = fileOrBlob.type || 'image/webp';
  let extension = 'webp';

  // Si es un File nativo, comprimirlo primero
  if (fileOrBlob instanceof File) {
    try {
      const optimized = await compressAndResizeImage(fileOrBlob, 1200, 0.82);
      uploadBlob = optimized.blob;
      mimeType = optimized.mimeType;
      extension = optimized.extension;
    } catch (optErr) {
      console.warn('No se pudo optimizar previamente, subiendo directo:', optErr);
    }
  }

  // Sanitizar nombre de archivo
  const cleanName = suggestedName
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);
  
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const storagePath = `${folder}/${productId}/${timestamp}_${cleanName}_${randomSuffix}.${extension}`;

  const storageRef = ref(storage, storagePath);

  // Subir con metadatos de caché óptimos
  const metadata = {
    contentType: mimeType,
    cacheControl: 'public, max-age=31536000', // 1 año de caché en navegador
  };

  const uploadResult = await uploadBytes(storageRef, uploadBlob, metadata);
  const downloadUrl = await getDownloadURL(uploadResult.ref);
  return downloadUrl;
}

/**
 * Elimina una imagen de Firebase Storage a partir de su URL pública
 */
export async function deleteImageFromStorageByUrl(url: string): Promise<void> {
  if (!isFirebaseStorageUrl(url)) {
    // Si es una URL externa (Unsplash, etc.), no hace nada
    return;
  }

  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error: any) {
    // Si el objeto ya no existía (404 / object-not-found), no es un error crítico
    if (error?.code !== 'storage/object-not-found') {
      console.warn('Aviso al eliminar imagen de Firebase Storage:', error);
    }
  }
}

/**
 * Elimina todos los archivos contenidos en la carpeta de un producto en Firebase Storage
 * Evita la acumulación de archivos huérfanos.
 */
export async function deleteProductImagesFolder(
  productId: string,
  isExtra = false
): Promise<void> {
  const folder = isExtra ? 'extra_products' : 'products';
  const folderRef = ref(storage, `${folder}/${productId}`);

  try {
    const res = await listAll(folderRef);
    const deletePromises = res.items.map((itemRef) =>
      deleteObject(itemRef).catch((err) => {
        if (err?.code !== 'storage/object-not-found') {
          console.warn('Error eliminando item de Storage:', err);
        }
      })
    );
    await Promise.all(deletePromises);
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') {
      console.warn('Aviso al listar carpeta de Storage para eliminar:', error);
    }
  }
}
