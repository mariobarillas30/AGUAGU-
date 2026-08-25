import React from 'react';
import aguAguLogoImg from '../../assets/images/agu_agu_logo_1787159055244.jpg';

interface AguAguLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  className?: string;
}

export const AguAguLogo: React.FC<AguAguLogoProps> = ({
  size = 'md',
  showText = true,
  textColor = '#4A4E69',
  className = '',
}) => {
  const sizeMap = {
    sm: { img: 'w-8 h-8 rounded-xl', text: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'w-10 h-10 rounded-2xl', text: 'text-base sm:text-lg', sub: 'text-[11px]' },
    lg: { img: 'w-14 h-14 rounded-3xl', text: 'text-xl sm:text-2xl', sub: 'text-xs' },
    xl: { img: 'w-20 h-20 rounded-3xl', text: 'text-2xl sm:text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* Logo Graphic container */}
      <div className={`relative overflow-hidden shadow-xs border border-white/60 bg-[#B8D8F8] shrink-0 ${currentSize.img}`}>
        <img
          src={aguAguLogoImg}
          alt="Agu Agu Logo"
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
