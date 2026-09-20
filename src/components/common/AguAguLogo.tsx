import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import aguAguLogoImg from '../../assets/images/agu_agu_logo_1787159055244.jpg';

interface AguAguLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  className?: string;
  customLogoUrl?: string;
}

// Module-level cache and listener so all AguAguLogo instances stay in sync without redundant requests
let globalCachedLogoUrl: string | null = null;
const logoListeners = new Set<(url: string | null) => void>();
let isConfigSubscribed = false;

function initGlobalStoreLogoListener() {
  if (isConfigSubscribed) return;
  isConfigSubscribed = true;
  try {
    const configDocRef = doc(db, 'config', 'store_settings');
    onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const url = (data?.logoUrl && typeof data.logoUrl === 'string' && data.logoUrl.trim() !== '') 
          ? data.logoUrl.trim() 
          : null;
        globalCachedLogoUrl = url;
        logoListeners.forEach((cb) => cb(url));
      }
    }, (err) => {
      console.warn('Error en listener de logo en store_settings:', err);
    });
  } catch (err) {
    console.warn('No se pudo inicializar listener global de logo:', err);
  }
}

export const AguAguLogo: React.FC<AguAguLogoProps> = ({
  size = 'md',
  showText = true,
  textColor = '#4A4E69',
  className = '',
  customLogoUrl,
}) => {
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(customLogoUrl ?? globalCachedLogoUrl);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    if (customLogoUrl !== undefined) {
      setCurrentLogoUrl(customLogoUrl);
      setHasImageError(false);
      return;
    }

    initGlobalStoreLogoListener();
    const handleUpdate = (newUrl: string | null) => {
      setCurrentLogoUrl(newUrl);
      setHasImageError(false);
    };

    logoListeners.add(handleUpdate);
    if (globalCachedLogoUrl !== currentLogoUrl) {
      setCurrentLogoUrl(globalCachedLogoUrl);
    }

    return () => {
      logoListeners.delete(handleUpdate);
    };
  }, [customLogoUrl]);

  const sizeMap = {
    sm: { img: 'w-8 h-8 rounded-xl', text: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'w-10 h-10 rounded-2xl', text: 'text-base sm:text-lg', sub: 'text-[11px]' },
    lg: { img: 'w-14 h-14 rounded-3xl', text: 'text-xl sm:text-2xl', sub: 'text-xs' },
    xl: { img: 'w-20 h-20 rounded-3xl', text: 'text-2xl sm:text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];
  const activeImageSrc = (!hasImageError && currentLogoUrl) ? currentLogoUrl : aguAguLogoImg;

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Logo Graphic container */}
      <div className={`relative overflow-hidden shadow-xs border border-white/60 bg-[#B8D8F8] shrink-0 ${currentSize.img}`}>
        <img
          src={activeImageSrc}
          alt="Agu Agu Logo"
          onError={() => setHasImageError(true)}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-heading font-extrabold tracking-tight ${currentSize.text}`}
              style={{ color: textColor }}
            >
              Agu Agu
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F7C8D0] text-[#D64E66]">
              Oficial
            </span>
          </div>
          <span className={`block font-semibold text-[#8C90A4] ${currentSize.sub}`}>
            Mesa de Regalos
          </span>
        </div>
      )}
    </div>
  );
};

