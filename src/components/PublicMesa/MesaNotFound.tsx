import React from 'react';
import { ArrowLeft, HeartCrack, HelpCircle } from 'lucide-react';
import { AguAguLogo } from '../common/AguAguLogo';

interface MesaNotFoundProps {
  slug: string;
  onGoBack: () => void;
  onLookupAnother?: () => void;
}

export const MesaNotFound: React.FC<MesaNotFoundProps> = ({
  slug,
  onGoBack,
}) => {
  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#F2EAE0] shadow-sm text-center">
        
        {/* Soft Icon Badge */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-[#FFF0F3] to-[#FDFBF7] rounded-3xl p-1 shadow-2xs flex items-center justify-center border border-[#F7C8D0]">
          <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center text-[#E58C8A]">
            <HeartCrack className="w-10 h-10 text-[#E58C8A]" />
          </div>
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-[#FFF5F6] text-[#D64E66] text-[11px] font-bold border border-[#F7C8D0] mb-3">
          Error 404 • Enlace No Disponible
        </span>

        <h2 className="text-2xl font-heading font-extrabold text-[#4A4E69] mb-3">
          Mesa de Regalos No Encontrada
        </h2>

        <p className="text-xs sm:text-sm text-[#6C7086] leading-relaxed mb-6">
          No existe una mesa activa asociada al enlace privado ingresado. Por favor verifica que el enlace compartido por la familia esté completo.
        </p>

        {/* Informative advice box */}
        <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E2D9CF] text-xs text-[#6C7086] text-left flex items-start gap-2.5 mb-8">
          <HelpCircle className="w-4 h-4 text-[#A8D8EA] shrink-0 mt-0.5" />
          <span>
            Por motivos de privacidad, las mesas de regalos de <strong>Agu Agu</strong> son privadas y solo se puede acceder con el enlace exacto provisto por los anfitriones.
          </span>
        </div>

        {/* Clean Return Button */}
        <button
          id="btn-back-to-home"
          onClick={onGoBack}
          className="w-full px-6 py-3 rounded-2xl bg-[#FF8B8B] text-white text-xs font-bold hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la Página Principal
        </button>
      </div>
    </div>
  );
};
