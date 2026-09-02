import React, { useState } from 'react';
import {
  Gift,
  Heart,
  Sparkles,
  Store,
  ArrowRight,
  Package,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { AguAguLogo } from './common/AguAguLogo';
import { normalizeTableSlug } from '../utils/slug';

interface HomeProps {
  onNavigate: (view: 'home' | 'admin' | 'public_mesa', slug?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [directCodeInput, setDirectCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');

  const handleDirectAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeTableSlug(directCodeInput);
    if (!clean) {
      setCodeError('Por favor ingresa el código privado de la mesa.');
      return;
    }
    setCodeError('');
    onNavigate('public_mesa', clean);
  };

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-white rounded-3xl p-8 sm:p-14 border border-gray-100 shadow-sm overflow-hidden text-center">
          
          {/* Ambient soft glow */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#A8D8EA]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#F7C8D0]/30 rounded-full blur-3xl pointer-events-none" />

          {/* Centered Brand Logo */}
          <div className="flex justify-center mb-6">
            <AguAguLogo size="xl" showText={false} className="shadow-md rounded-3xl" />
          </div>

          {/* Boutique Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FDFBF7] border border-pink-100 text-[#FF8B8B] text-xs font-extrabold shadow-2xs mb-6">
            <Heart className="w-4 h-4 fill-[#FF8B8B]" />
            <span>Agu Agu • Servicio Exclusivo de Mesa de Regalos</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-[#4A4A4A] tracking-tight max-w-3xl mx-auto leading-tight mb-4">
            Celebrando la llegada más especial con <span className="text-[#FF8B8B]">Agu Agu</span>.
          </h1>

          <p className="text-sm sm:text-base text-[#5D5C5B] max-w-xl mx-auto leading-relaxed mb-8">
            Nuestras mesas de regalos son privadas y personalizadas. Si eres invitado o familiar, ingresa directamente mediante el enlace único compartido por los anfitriones.
          </p>

          {/* Direct Private Code Access (No open browsing or search) */}
          <div className="max-w-md mx-auto mb-8">
            <form onSubmit={handleDirectAccess} className="relative">
              <div className="flex items-center bg-[#FAF7F2] p-1.5 rounded-2xl border-2 border-[#E2D9CF] focus-within:border-[#A8D8EA] focus-within:bg-white transition-all shadow-xs">
                <Lock className="w-4 h-4 text-[#8E8D8A] ml-3 shrink-0" />
                <input
                  id="input-direct-mesa-code"
                  type="text"
                  placeholder="Ingresa código privado (ej: familia-perez)"
                  value={directCodeInput}
                  onChange={(e) => {
                    setDirectCodeInput(e.target.value);
                    if (codeError) setCodeError('');
                  }}
                  className="flex-1 px-3 py-2 text-xs sm:text-sm text-[#4A4A4A] bg-transparent focus:outline-none placeholder:text-[#8E8D8A]/70"
                />
                <button
                  id="btn-submit-direct-code"
                  type="submit"
                  disabled={!directCodeInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#FF8B8B] text-white font-bold text-xs shadow-xs hover:bg-[#ff7a7a] active:scale-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
                >
                  <span>Abrir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
            {codeError && (
              <p className="text-xs text-[#D64E66] mt-2 font-medium">{codeError}</p>
            )}
            <p className="text-[11px] text-[#8E8D8A] mt-2">
              🔒 Acceso privado y protegido para familias e invitados.
            </p>
          </div>

          {/* Boutique Privacy Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E2D9CF] text-xs text-[#6C7086]">
            <ShieldCheck className="w-4 h-4 text-[#00897B]" />
            <span>Mesa de regalos gestionada exclusivamente en Boutique Agu Agu</span>
          </div>
        </div>
      </div>

      {/* Exclusivity & Process Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#4A4A4A]">
            ¿Cómo funciona el servicio exclusivo de Agu Agu?
          </h2>
          <p className="text-xs text-[#8E8D8A] mt-1">
            Privacidad, distinción y facilidad para los padres y sus invitados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Creación en Tienda */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#A8D8EA]/40 text-[#2C5F70] flex items-center justify-center font-bold text-lg mb-4">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#4A4A4A] mb-2">
                1. Creación en Tienda
              </h3>
              <p className="text-xs text-[#5D5C5B] leading-relaxed">
                El equipo de Agu Agu asesora a la familia en tienda y crea su lista de regalos oficial con los mejores productos de nuestro catálogo.
              </p>
            </div>
          </div>

          {/* Card 2: Enlace Privado Único */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#F7C8D0]/50 text-[#D64E66] flex items-center justify-center font-bold text-lg mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#4A4A4A] mb-2">
                2. Enlace Privado Exclusivo
              </h3>
              <p className="text-xs text-[#5D5C5B] leading-relaxed">
                Cada mesa cuenta con una URL única autogenerada. No existen listados públicos ni búsquedas abiertas; solo los invitados con el link pueden ingresar.
              </p>
            </div>
          </div>

          {/* Card 3: Regalos con Amor */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FFEAA7]/60 text-[#B76E00] flex items-center justify-center font-bold text-lg mb-4">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#4A4A4A] mb-2">
                3. Selección de Regalos
              </h3>
              <p className="text-xs text-[#5D5C5B] leading-relaxed">
                Los invitados eligen sus regalos sin necesidad de registro previo y pueden reservarlos para pago en tienda o pago con tarjeta vía WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
