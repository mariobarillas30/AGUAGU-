import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Heart,
  Baby,
  Users,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import { GiftTable } from '../../types';

interface GiftTableInfoCountdownProps {
  table: GiftTable;
}

/**
 * Función pura para calcular el identificador visible de la mesa.
 * Prioriza tableNumber / idNumber / number explícito, o genera un identificador
 * numérico consistente a partir del ID de la mesa.
 */
function getDisplayId(table: GiftTable): string {
  const customId =
    (table as any).tableNumber ??
    (table as any).idNumber ??
    (table as any).number;

  if (customId !== undefined && customId !== null && String(customId).trim() !== '') {
    return `#${String(customId).replace(/^#/, '')}`;
  }

  if (table.id) {
    if (/^\d+$/.test(table.id)) {
      return `#${table.id}`;
    }
    if (table.id.length <= 6) {
      return `#${table.id.toUpperCase()}`;
    }
    // Generar hash numérico determinista (ej. #190) para IDs alfanuméricos largos de Firestore
    let hash = 0;
    for (let i = 0; i < table.id.length; i++) {
      hash = (hash * 31 + table.id.charCodeAt(i)) >>> 0;
    }
    const num = (hash % 900) + 100;
    return `#${num}`;
  }

  return '#101';
}

/**
 * Obtiene el nombre de la mamá de los campos existentes de la mesa,
 * con derivación segura si solo se registró el nombre de la familia o del bebé.
 */
function getMomName(table: GiftTable): string {
  const explicit =
    (table as any).momName ||
    (table as any).motherName ||
    (table as any).mama ||
    (table as any).nombreMama;

  if (explicit && typeof explicit === 'string' && explicit.trim() !== '') {
    return explicit.trim();
  }

  // Si 'organizer' o 'familyName' es un nombre de persona (ej. "Ashley Reyes"), extraer el primer nombre
  const organizer = (table as any).organizer || (table as any).organiza;
  if (organizer && typeof organizer === 'string') {
    const cleanOrg = organizer.trim();
    if (!cleanOrg.toLowerCase().startsWith('familia')) {
      return cleanOrg.split(/\s+/)[0];
    }
  }

  if (table.familyName && typeof table.familyName === 'string') {
    const cleanFam = table.familyName.trim();
    if (!cleanFam.toLowerCase().startsWith('familia')) {
      return cleanFam.split(/\s+/)[0];
    }
  }

  // Si tiene nombre del bebé
  if (table.babyName && typeof table.babyName === 'string' && table.babyName.trim() !== '') {
    return `Mamá de ${table.babyName.trim()}`;
  }

  // Fallback con el apellido de la familia
  if (table.familyName && typeof table.familyName === 'string') {
    return table.familyName.replace(/^Familia\s+/i, 'Mamá ');
  }

  return 'Mamá';
}

/**
 * Obtiene el organizador del evento
 */
function getOrganizer(table: GiftTable): string {
  const explicit =
    (table as any).organizer ||
    (table as any).organiza ||
    (table as any).hostedBy;

  if (explicit && typeof explicit === 'string' && explicit.trim() !== '') {
    return explicit.trim();
  }

  return table.familyName || 'Familia';
}

/**
 * Obtiene el género del bebé de los campos existentes de la mesa o por derivación
 */
function getGender(table: GiftTable): string {
  const explicit =
    (table as any).gender ||
    (table as any).genero ||
    (table as any).babyGender;

  if (explicit && typeof explicit === 'string' && explicit.trim() !== '') {
    const clean = explicit.trim();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  if (table.babyName && typeof table.babyName === 'string') {
    const bn = table.babyName.trim().toLowerCase();
    const boyNames = [
      'mateo', 'pepe', 'lucas', 'santiago', 'leo', 'noah', 'liam', 'ian',
      'joaquin', 'matias', 'benjamin', 'thiago', 'dylan', 'emiliano', 'sebastian'
    ];
    const girlNames = [
      'belen', 'sofia', 'camila', 'valentina', 'isabella', 'lucia', 'mia',
      'emma', 'martina', 'elena', 'ashley', 'victoria', 'daniela', 'regina'
    ];

    if (boyNames.includes(bn)) return 'Niño';
    if (girlNames.includes(bn)) return 'Niña';
    if (bn.endsWith('o') || bn.endsWith('e')) return 'Niño';
    if (bn.endsWith('a')) return 'Niña';
  }

  return 'Por revelar';
}

/**
 * Formatea la fecha de la mesa en DD/MM/YYYY
 */
function formatEventDate(dateStr?: string): string {
  if (!dateStr) return '--/--/----';

  // Si ya viene con formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Si viene con formato YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4 && parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    if (parts[2].length === 4 && parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${day}/${month}/${year}`;
    }
  }

  return dateStr;
}

/**
 * Formatea la hora del evento en formato legible de 12 horas (ej. 04:00 PM)
 */
function formatEventTime(timeStr?: string): string {
  if (!timeStr || typeof timeStr !== 'string' || timeStr.trim() === '') {
    return '04:00 PM';
  }

  const clean = timeStr.trim().toUpperCase();

  // Si ya tiene AM o PM
  if (clean.includes('AM') || clean.includes('PM')) {
    const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (match) {
      const hh = match[1].padStart(2, '0');
      const mm = match[2];
      const ampm = match[3];
      return `${hh}:${mm} ${ampm}`;
    }
    return clean;
  }

  // Si viene en formato militar 24h (ej. 16:00 o 16:00:00)
  const parts = clean.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10) || 0;
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      return `${hh}:${mm} ${ampm}`;
    }
  }

  return clean;
}

/**
 * Parsea la fecha y hora existentes de la mesa a un objeto Date local
 * asegurando coincidencia milimétrica con la zona horaria del cliente.
 */
function parseTargetEventDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr) return null;

  let year = 0;
  let month = 0;
  let day = 0;

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts[2]?.length === 4) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else if (parts[0]?.length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }

  if (!year || !month || !day) return null;

  // Hora por defecto: 16:00 (04:00 PM) conforme a los eventos habituales y referencia
  let hours = 16;
  let minutes = 0;

  const rawTime = timeStr || '04:00 PM';
  const cleanTime = rawTime.trim().toUpperCase();
  const isPM = cleanTime.includes('PM');
  const isAM = cleanTime.includes('AM');
  const digitsOnly = cleanTime.replace(/[^\d:]/g, '');
  const [hStr, mStr] = digitsOnly.split(':');

  if (hStr) {
    let h = parseInt(hStr, 10);
    const m = mStr ? parseInt(mStr, 10) : 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    if (!isNaN(h) && h >= 0 && h < 24) hours = h;
    if (!isNaN(m) && m >= 0 && m < 60) minutes = m;
  }

  // Se construye el Date en la zona horaria local sin desfases arbitrarios
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Divide un número en un array de caracteres de dígitos.
 * Asegura un mínimo de dígitos (por defecto 2) sin números negativos.
 */
function toDigitsArray(value: number, minDigits = 2): string[] {
  const safeVal = Math.max(0, Math.floor(value));
  const str = safeVal.toString();
  const padded = str.length < minDigits ? str.padStart(minDigits, '0') : str;
  return padded.split('');
}

export const GiftTableInfoCountdown: React.FC<GiftTableInfoCountdownProps> = ({ table }) => {
  // 1. Datos informativos derivados de la mesa actual
  const displayId = useMemo(() => getDisplayId(table), [table]);
  const momName = useMemo(() => getMomName(table), [table]);
  const organizer = useMemo(() => getOrganizer(table), [table]);
  const gender = useMemo(() => getGender(table), [table]);

  const rawTime = (table as any).eventTime || (table as any).time || (table as any).hora;
  const formattedDate = useMemo(() => formatEventDate(table.eventDate), [table.eventDate]);
  const formattedTime = useMemo(() => formatEventTime(rawTime), [rawTime]);

  // 2. Fecha y hora objetivo de finalización
  const targetDate = useMemo(() => {
    return parseTargetEventDateTime(table.eventDate, rawTime);
  }, [table.eventDate, rawTime]);

  // 3. Estado del contador en tiempo real
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>(() => {
    if (!targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false };
    }
    const diffMs = targetDate.getTime() - Date.now();
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }
    const totalSecs = Math.floor(diffMs / 1000);
    return {
      days: Math.floor(totalSecs / 86400),
      hours: Math.floor((totalSecs % 86400) / 3600),
      minutes: Math.floor((totalSecs % 3600) / 60),
      seconds: totalSecs % 60,
      isExpired: false,
    };
  });

  useEffect(() => {
    if (!targetDate) return;

    // Función que recalcula el tiempo restante exacto entre target y now
    const calculateTimeRemaining = () => {
      const diffMs = targetDate.getTime() - Date.now();

      if (diffMs <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
        return false; // Detener intervalo
      }

      const totalSecs = Math.floor(diffMs / 1000);
      setTimeLeft({
        days: Math.floor(totalSecs / 86400),
        hours: Math.floor((totalSecs % 86400) / 3600),
        minutes: Math.floor((totalSecs % 3600) / 60),
        seconds: totalSecs % 60,
        isExpired: false,
      });
      return true;
    };

    // Calcular inmediatamente al montar o cambiar targetDate
    const shouldContinue = calculateTimeRemaining();
    if (!shouldContinue) return;

    // Actualización regular cada segundo
    const intervalId = window.setInterval(() => {
      const isRunning = calculateTimeRemaining();
      if (!isRunning) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [targetDate]);

  const daysDigits = toDigitsArray(timeLeft.days, 2);
  const hoursDigits = toDigitsArray(timeLeft.hours, 2);
  const minutesDigits = toDigitsArray(timeLeft.minutes, 2);
  const secondsDigits = toDigitsArray(timeLeft.seconds, 2);

  return (
    <section
      id="gift-table-info-countdown"
      aria-label="Información y contador de la mesa de regalos"
      className="bg-white rounded-3xl border border-[#F2EAE0] p-6 sm:p-8 md:p-10 shadow-xs mb-10 transition-all"
    >
      {/* SECCIÓN SUPERIOR: INFORMACIÓN DE LA MESA (2 COLUMNAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pb-7 sm:pb-8 border-b border-[#F2EAE0]">
        
        {/* COLUMNA IZQUIERDA */}
        <div id="gift-table-info-left-col" className="space-y-4 sm:space-y-5">
          {/* ID */}
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Hash className="w-3.5 h-3.5 text-[#A8D8EA]" />
              ID
            </span>
            <p className="text-xl sm:text-2xl font-heading font-extrabold text-[#4A4E69] tracking-tight">
              {displayId}
            </p>
          </div>

          {/* NOMBRE DE LA MAMÁ */}
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Heart className="w-3.5 h-3.5 text-[#F7C8D0]" />
              NOMBRE DE LA MAMÁ
            </span>
            <p className="text-base sm:text-lg font-heading font-bold text-[#4A4E69]">
              {momName}
            </p>
          </div>

          {/* FECHA */}
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#E6B875]" />
              FECHA
            </span>
            <p className="text-base sm:text-lg font-heading font-bold text-[#4A4E69]">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div id="gift-table-info-right-col" className="space-y-4 sm:space-y-5">
          {/* ORGANIZA */}
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-[#A8D8EA]" />
              ORGANIZA
            </span>
            <p className="text-base sm:text-lg font-heading font-bold text-[#4A4E69]">
              {organizer}
            </p>
          </div>

          {/* GÉNERO */}
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Baby className="w-3.5 h-3.5 text-[#E58C8A]" />
              GÉNERO
            </span>
            <div className="flex items-center gap-2">
              <p className="text-base sm:text-lg font-heading font-bold text-[#4A4E69]">
                {gender}
              </p>
              {gender === 'Niño' && (
                <span className="px-2 py-0.5 rounded-full bg-[#EBF7FC] text-[#4A90E2] text-[11px] font-bold">
                  Baby Boy
                </span>
              )}
              {gender === 'Niña' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FFF0F3] text-[#E58C8A] text-[11px] font-bold">
                  Baby Girl
                </span>
              )}
            </div>
          </div>

          {/* HORA */}
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-[#E6B875]" />
              HORA
            </span>
            <p className="text-base sm:text-lg font-heading font-bold text-[#4A4E69]">
              {formattedTime}
            </p>
          </div>
        </div>

      </div>

      {/* SECCIÓN INFERIOR: CONTADOR REGRESIVO */}
      <div id="gift-table-countdown-section" className="pt-6 sm:pt-7 text-center">
        
        {/* Encabezado del contador */}
        <div className="mb-5 sm:mb-6">
          {timeLeft.isExpired ? (
            <div
              id="countdown-expired-status"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FFF5F6] border border-[#F7C8D0] text-[#D64E66] text-xs sm:text-sm font-bold shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-[#D64E66]" />
              <span>La mesa de regalo ha finalizado</span>
            </div>
          ) : (
            <div
              id="countdown-active-heading"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#6C7086]"
            >
              <Clock className="w-4 h-4 text-[#E58C8A] animate-pulse" />
              <span>La mesa de regalo finaliza en:</span>
            </div>
          )}
        </div>

        {/* Tarjetas de unidades del contador */}
        <div
          id="countdown-units-container"
          className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 flex-wrap sm:flex-nowrap"
        >
          {/* UNIDAD: DÍAS */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider mb-1.5">
              Días
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {daysDigits.map((digit, idx) => (
                <div
                  key={`day-digit-${idx}`}
                  className="w-8 h-11 sm:w-11 sm:h-15 md:w-13 md:h-17 bg-[#FAF7F2] border border-[#E8DFC8] rounded-xl shadow-2xs flex items-center justify-center font-heading font-extrabold text-lg sm:text-2xl md:text-3xl text-[#4A4E69] select-none"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          <span className="hidden sm:inline-block text-[#C5B8A5] font-bold text-lg sm:text-2xl pt-5 select-none">
            :
          </span>

          {/* UNIDAD: HORAS */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider mb-1.5">
              Horas
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {hoursDigits.map((digit, idx) => (
                <div
                  key={`hour-digit-${idx}`}
                  className="w-8 h-11 sm:w-11 sm:h-15 md:w-13 md:h-17 bg-[#FAF7F2] border border-[#E8DFC8] rounded-xl shadow-2xs flex items-center justify-center font-heading font-extrabold text-lg sm:text-2xl md:text-3xl text-[#4A4E69] select-none"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          <span className="hidden sm:inline-block text-[#C5B8A5] font-bold text-lg sm:text-2xl pt-5 select-none">
            :
          </span>

          {/* UNIDAD: MINUTOS */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider mb-1.5">
              Minutos
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {minutesDigits.map((digit, idx) => (
                <div
                  key={`min-digit-${idx}`}
                  className="w-8 h-11 sm:w-11 sm:h-15 md:w-13 md:h-17 bg-[#FAF7F2] border border-[#E8DFC8] rounded-xl shadow-2xs flex items-center justify-center font-heading font-extrabold text-lg sm:text-2xl md:text-3xl text-[#4A4E69] select-none"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          <span className="hidden sm:inline-block text-[#C5B8A5] font-bold text-lg sm:text-2xl pt-5 select-none">
            :
          </span>

          {/* UNIDAD: SEGUNDOS */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] sm:text-xs font-bold text-[#8C90A4] uppercase tracking-wider mb-1.5">
              Segundos
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              {secondsDigits.map((digit, idx) => (
                <div
                  key={`sec-digit-${idx}`}
                  className="w-8 h-11 sm:w-11 sm:h-15 md:w-13 md:h-17 bg-[#FAF7F2] border border-[#E8DFC8] rounded-xl shadow-2xs flex items-center justify-center font-heading font-extrabold text-lg sm:text-2xl md:text-3xl text-[#E58C8A] select-none"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
