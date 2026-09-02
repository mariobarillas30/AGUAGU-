/**
 * Módulo centralizado para la normalización, generación y resolución
 * de identificadores/slugs y enlaces canónicos de Mesas de Regalo.
 * 
 * Regla de Negocio:
 * - Toda mesa cuenta con un identificador único normalizado (minúsculas, sin acentos, sin caracteres especiales).
 * - La normalización debe ser estrictamente idéntica al generar, guardar, leer de la URL y consultar Firestore.
 */

/**
 * Normaliza un slug o identificador de mesa de manera consistente y determinista.
 * - Convierte a minúsculas
 * - Elimina acentos y diacríticos (NFD)
 * - Reemplaza cualquier carácter no alfanumérico por un guión '-'
 * - Elimina guiones repetidos y guiones al inicio/final
 */
export function normalizeTableSlug(rawInput: string): string {
  if (!rawInput) return '';

  return rawInput
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos y diacríticos
    .replace(/^#mesa\//, '')         // Limpiar prefijo hash si fue pegado
    .replace(/^\/mesa\//, '')        // Limpiar prefijo pathname si fue pegado
    .replace(/^#/, '')               // Limpiar hash simple
    .replace(/[^a-z0-9]+/g, '-')     // Reemplazar espacios y caracteres especiales por guión
    .replace(/^-+|-+$/g, '');        // Eliminar guiones al inicio o al final
}

/**
 * Genera un slug aleatorio único basado en el nombre de la familia o del bebé.
 * Formato conceptual: familia-perez-x7k2a
 */
export function generateRandomSlug(baseName: string): string {
  const cleanBase = normalizeTableSlug(baseName).slice(0, 24);
  // Sufijo aleatorio criptográfico/alfanumérico de 5 caracteres
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return cleanBase ? `${cleanBase}-${randomSuffix}` : `mesa-${randomSuffix}`;
}

/**
 * Genera el enlace de invitación canónico para una mesa específica.
 * Utiliza el origen actual del navegador y la ruta canónica #mesa/{slug_normalizado}.
 */
export function getCanonicalMesaUrl(slug: string): string {
  const normalized = normalizeTableSlug(slug);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const basePath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '';
  return `${origin}${basePath}/#mesa/${normalized}`;
}
