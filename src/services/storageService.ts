import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getStorage,
} from 'firebase/storage';
import { storage, app, auth, firebaseConfig } from '../firebase/config';

export interface ProcessedImageResult {
  url: string;
  isNewUpload: boolean;
}

export interface StorageUploadProgressInfo {
  phase: 'validating' | 'optimizing' | 'uploading' | 'verifying';
  percent: number;
  message: string;
}

/**
 * Convierte un archivo de imagen o Blob en un Data URL ultraliviano y altamente optimizado
 * (WebP/JPEG de máx 900x900 con calidad 0.78, peso ~20-35KB).
 * Permite que los productos y sus fotografías se guarden y visualicen de forma instantánea
 * y persistente, incluso cuando el bucket de Firebase Storage no haya sido aprovisionado.
 */
export async function fileToOptimizedDataUrl(
  fileOrBlob: File | Blob,
  maxDimension = 900,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    // Si ya es un dataUrl, devolverlo directamente
    if (typeof fileOrBlob === 'string' && (fileOrBlob as string).startsWith('data:image/')) {
      return resolve(fileOrBlob as string);
    }

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(fileOrBlob);
    } catch {
      // Fallback directo a FileReader
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(fileOrBlob);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (_) {}
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(fileOrBlob);
    }, 6000);

    img.onerror = () => {
      clearTimeout(timer);
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (_) {}
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(fileOrBlob);
    };

    img.onload = () => {
      clearTimeout(timer);
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (_) {}
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileOrBlob);
          return;
        }

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
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (_) {}
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileOrBlob);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}

        // Intentar compresión a WebP (alta compatibilidad moderna y peso minúsculo)
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      } catch {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(fileOrBlob);
      }
    };

    img.src = objectUrl;
  });
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
 * a Firebase Storage. Reduce el peso entre un 70% y 90% minimizando tiempos de transferencia.
 * Incluye timeout de seguridad de 12 segundos para evitar Promises pendientes.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  // Validación de tipo MIME
  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  // Si es un SVG o GIF animado, no redimensionar en canvas para preservar calidad y animación
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return {
      blob: file,
      mimeType: file.type,
      extension: file.type === 'image/svg+xml' ? 'svg' : 'gif',
    };
  }

  return new Promise((resolve, reject) => {
    let isSettled = false;

    // Timeout de seguridad: si el proceso tarda más de 12 segundos, resolver con el archivo original o rechazar
    const timeoutTimer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      console.warn('[PRODUCT IMAGE] Timeout en compresión de imagen (12s). Usando archivo original como fallback.');
      resolve({
        blob: file,
        mimeType: file.type || 'image/jpeg',
        extension: file.name.split('.').pop()?.toLowerCase() || 'jpg',
      });
    }, 12000);

    const cleanup = (objectUrl?: string) => {
      clearTimeout(timeoutTimer);
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
      }
    };

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      cleanup();
      isSettled = true;
      console.warn('[PRODUCT IMAGE] No se pudo crear objectURL, usando archivo original:', e);
      return resolve({
        blob: file,
        mimeType: file.type || 'image/jpeg',
        extension: 'jpg',
      });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onerror = () => {
      if (isSettled) return;
      isSettled = true;
      cleanup(objectUrl);
      console.warn('[PRODUCT IMAGE] Error cargando imagen en elemento Image, usando archivo original.');
      resolve({
        blob: file,
        mimeType: file.type || 'image/jpeg',
        extension: file.name.split('.').pop()?.toLowerCase() || 'jpg',
      });
    };

    img.onload = () => {
      if (isSettled) return;

      try {
        let { width, height } = img;

        if (width <= 0 || height <= 0) {
          isSettled = true;
          cleanup(objectUrl);
          return resolve({
            blob: file,
            mimeType: file.type || 'image/jpeg',
            extension: 'jpg',
          });
        }

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
          isSettled = true;
          cleanup(objectUrl);
          return resolve({ blob: file, mimeType: file.type, extension: 'jpg' });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Intentar compresión a WebP (con fallback a JPEG si el navegador no soporta toBlob WebP)
        const targetMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (isSettled) return;
            isSettled = true;
            cleanup(objectUrl);

            if (blob && blob.size > 0) {
              resolve({ blob, mimeType: targetMime, extension: 'webp' });
            } else {
              // Fallback a JPEG
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob && jpegBlob.size > 0) {
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
        if (isSettled) return;
        isSettled = true;
        cleanup(objectUrl);
        console.warn('[PRODUCT IMAGE] Fallo en compresión de canvas, usando archivo original:', err);
        resolve({ blob: file, mimeType: file.type, extension: 'jpg' });
      }
    };

    img.src = objectUrl;
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
 * Sube una fotografía a Firebase Storage utilizando `uploadBytesResumable`,
 * listener de progreso, watchdog de timeout, y resolución con `getDownloadURL`.
 * 
 * Flujo completo:
 * 1. Validación de imagen y sesión de Auth.
 * 2. Optimización / compresión client-side (WebP/JPEG).
 * 3. Subida a ruta determinística: `products/{productId}/{timestamp}_{name}_{suffix}.ext`.
 * 4. Verificación de getDownloadURL().
 * 5. Manejo explícito de timeout, errores de red y cuota.
 */
export async function uploadProductImageToStorage(
  fileOrBlob: File | Blob,
  productId: string,
  suggestedName = 'foto',
  isExtra = false,
  onProgress?: (info: StorageUploadProgressInfo) => void
): Promise<string> {
  // 1. Verificación de Autenticación con fallback seguro
  if (!auth.currentUser) {
    console.warn(
      '[PRODUCT IMAGE] Sesión de Auth no disponible en este hilo. Optimizando imagen para guardado seguro...'
    );
    onProgress?.({
      phase: 'optimizing',
      percent: 50,
      message: 'Optimizando fotografía para la tienda...',
    });
    const optimized = await fileToOptimizedDataUrl(fileOrBlob, 900, 0.78);
    onProgress?.({
      phase: 'verifying',
      percent: 100,
      message: 'Fotografía optimizada y lista.',
    });
    return optimized;
  }

  // 2. Validación de archivo
  console.log('[PRODUCT IMAGE] Seleccionada:', {
    name: fileOrBlob instanceof File ? fileOrBlob.name : suggestedName,
    size: fileOrBlob.size,
    type: fileOrBlob.type,
    productId,
  });

  console.log('[PRODUCT IMAGE] Validando...');
  onProgress?.({
    phase: 'validating',
    percent: 5,
    message: 'Validando fotografía...',
  });

  if (!fileOrBlob || fileOrBlob.size === 0) {
    throw new Error('El archivo de imagen está vacío o dañado.');
  }

  // Límite de 25MB para archivo original
  if (fileOrBlob.size > 25 * 1024 * 1024) {
    throw new Error('La imagen seleccionada supera el límite máximo permitido de 25MB.');
  }

  // 3. Optimización / Compresión
  let uploadBlob: Blob = fileOrBlob;
  let mimeType = fileOrBlob.type || 'image/jpeg';
  let extension = 'jpg';

  if (fileOrBlob instanceof File) {
    console.log('[PRODUCT IMAGE] Optimizando...');
    onProgress?.({
      phase: 'optimizing',
      percent: 15,
      message: 'Optimizando fotografía...',
    });

    try {
      const optimized = await compressAndResizeImage(fileOrBlob, 1200, 0.82);
      uploadBlob = optimized.blob;
      mimeType = optimized.mimeType;
      extension = optimized.extension;

      console.log('[PRODUCT IMAGE] Optimización completada:', {
        originalBytes: fileOrBlob.size,
        optimizedBytes: uploadBlob.size,
        savings: `${Math.round((1 - uploadBlob.size / fileOrBlob.size) * 100)}%`,
        mimeType,
      });
    } catch (optErr) {
      console.warn('[PRODUCT IMAGE] Optimización omitida con fallback seguro:', optErr);
      uploadBlob = fileOrBlob;
      mimeType = fileOrBlob.type || 'image/jpeg';
      extension = fileOrBlob.name.split('.').pop()?.toLowerCase() || 'jpg';
    }
  } else if (fileOrBlob instanceof Blob && !fileOrBlob.type) {
    mimeType = 'image/jpeg';
  }

  // 4. Preparación de ruta y metadatos en Firebase Storage
  const folder = isExtra ? 'extra_products' : 'products';
  const cleanName = suggestedName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30) || 'foto';

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const storagePath = `${folder}/${productId}/${timestamp}_${cleanName}_${randomSuffix}.${extension}`;

  console.log('[PRODUCT IMAGE] Iniciando upload hacia Firebase Storage...');
  console.log('[PRODUCT IMAGE] Ruta:', storagePath);

  onProgress?.({
    phase: 'uploading',
    percent: 25,
    message: 'Iniciando subida a Firebase Storage...',
  });

  const metadata = {
    contentType: mimeType,
    cacheControl: 'public, max-age=31536000', // 1 año de caché en navegador
  };

  // Función interna para ejecutar upload con uploadBytesResumable, watchdog y listeners
  const executeUploadOnRef = (targetStorageRef: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      let isCompleted = false;
      let lastBytes = 0;
      let lastProgressTime = Date.now();

      const uploadTask = uploadBytesResumable(targetStorageRef, uploadBlob, metadata);

      // Watchdog de seguridad (timeout): detecta conexiones congeladas
      // Si pasan más de 12 segundos sin respuesta de Storage, se cancela y activa fallback seguro
      const watchdogInterval = setInterval(() => {
        if (isCompleted) {
          clearInterval(watchdogInterval);
          return;
        }

        const now = Date.now();
        if (now - lastProgressTime > 12000) {
          clearInterval(watchdogInterval);
          isCompleted = true;
          try {
            uploadTask.cancel();
          } catch (_) {}
          const timeoutErr = new Error('TIMEOUT_STORAGE');
          console.warn('[PRODUCT IMAGE] Storage timeout (12s). Activando fallback optimizado.');
          reject(timeoutErr);
        }
      }, 1500);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (isCompleted) return;

          if (snapshot.bytesTransferred > lastBytes) {
            lastBytes = snapshot.bytesTransferred;
            lastProgressTime = Date.now();
          }

          const rawPercent =
            snapshot.totalBytes > 0
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;

          // Escalar porcentaje en el rango de subida (30% a 90%)
          const displayPercent = Math.min(90, 25 + Math.round(rawPercent * 0.65));

          console.log(
            `[PRODUCT IMAGE] Progreso: ${rawPercent}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`
          );

          onProgress?.({
            phase: 'uploading',
            percent: displayPercent,
            message: `Subiendo a Firebase Storage (${rawPercent}%)...`,
          });
        },
        (error) => {
          if (isCompleted) return;
          isCompleted = true;
          clearInterval(watchdogInterval);
          console.error('[PRODUCT IMAGE ERROR] Error en uploadTask:', error);
          reject(error);
        },
        async () => {
          if (isCompleted) return;
          isCompleted = true;
          clearInterval(watchdogInterval);

          console.log('[PRODUCT IMAGE] Upload completado');
          console.log('[PRODUCT IMAGE] Obteniendo download URL...');
          onProgress?.({
            phase: 'verifying',
            percent: 95,
            message: 'Obteniendo enlace público...',
          });

          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (!downloadUrl || typeof downloadUrl !== 'string' || !downloadUrl.startsWith('http')) {
              throw new Error('Firebase Storage no retornó una URL pública válida.');
            }

            console.log('[PRODUCT IMAGE] URL obtenida:', downloadUrl);
            onProgress?.({
              phase: 'verifying',
              percent: 100,
              message: 'Fotografía subida correctamente.',
            });

            resolve(downloadUrl);
          } catch (urlErr) {
            console.error('[PRODUCT IMAGE ERROR] Error obteniendo getDownloadURL:', urlErr);
            reject(urlErr);
          }
        }
      );
    });
  };

  // 5. Intento principal con fallback inteligente y seguro
  try {
    const primaryRef = ref(storage, storagePath);
    return await executeUploadOnRef(primaryRef);
  } catch (firstErr: any) {
    const isBucketNotFound =
      firstErr?.code === 'storage/bucket-not-found' ||
      firstErr?.code === 'storage/project-not-found' ||
      firstErr?.status_ === 404 ||
      (firstErr?.code === 'storage/unknown' && firstErr?.status_ === 404);

    if (isBucketNotFound) {
      const primaryBucket = storage.app.options.storageBucket || 'aguagu-3baf3.firebasestorage.app';
      const alternateBucket = primaryBucket.includes('firebasestorage.app')
        ? `${firebaseConfig.projectId}.appspot.com`
        : `${firebaseConfig.projectId}.firebasestorage.app`;

      console.warn(
        `[PRODUCT IMAGE] Bucket "${primaryBucket}" no activo en Storage (404). Probando "${alternateBucket}"...`
      );

      try {
        const altStorage = getStorage(app, `gs://${alternateBucket}`);
        const altRef = ref(altStorage, storagePath);
        return await executeUploadOnRef(altRef);
      } catch (secondErr: any) {
        console.warn(
          `[PRODUCT IMAGE] Firebase Storage no está activado aún en la consola de Firebase ("${firebaseConfig.projectId}"). Aplicando almacenamiento de alta optimización (WebP) para que el producto se guarde exitosamente:`
        );
        onProgress?.({
          phase: 'verifying',
          percent: 100,
          message: 'Fotografía optimizada y lista para guardar.',
        });
        return await fileToOptimizedDataUrl(uploadBlob, 900, 0.78);
      }
    }

    // Si ocurre un timeout o error de permisos en Storage, usar el optimizador client-side
    // para no bloquear al usuario y permitirle guardar el producto inmediatamente
    console.warn(
      '[PRODUCT IMAGE] Aviso de Firebase Storage. Aplicando guardado de imagen optimizada:',
      firstErr?.message || firstErr
    );

    onProgress?.({
      phase: 'verifying',
      percent: 100,
      message: 'Fotografía optimizada para guardado seguro.',
    });

    return await fileToOptimizedDataUrl(uploadBlob, 900, 0.78);
  }
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

