import React from 'react';
import { Store, ShieldCheck, Heart, Lock, ShieldX, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AguAguLogo } from './common/AguAguLogo';

interface HeaderProps {
  currentView: 'home' | 'admin' | 'public_mesa';
  onNavigate: (view: 'home' | 'admin' | 'public_mesa', slug?: string) => void;
  activeSlug?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const isGuestMesaView = currentView === 'public_mesa';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand: Agu Agu - Mesa de Regalos */}
          <div
            id="brand-logo"
            onClick={() => onNavigate('home')}
            className="cursor-pointer group hover:opacity-95 transition-opacity flex items-center gap-2"
          >
            <AguAguLogo size="md" showText={true} />
            {isGuestMesaView && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF0F3] text-[#E58C8A] text-[11px] font-bold border border-[#F7C8D0]">
                <Lock className="w-3 h-3 text-[#E58C8A]" />
                Invitación Exclusiva ✨
              </span>
            )}
          </div>

          {/* Center Title or Navigation */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-[#8E8D8A]">
            {!isGuestMesaView ? (
              <span className="px-3.5 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E8DFC8]/60 text-[#5D5C5B] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#FF8B8B] fill-[#FF8B8B]" />
                Mesa de Regalos Oficial de Boutique Agu Agu
              </span>
            ) : (
              <button
                onClick={() => onNavigate('home')}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#6C7086] hover:text-[#4A4E69] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                Página Principal
              </button>
            )}
          </div>

          {/* Right Action: Admin Access / User Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {isAdmin ? (
                  <>
                    <button
                      id="header-admin-dashboard-btn"
                      onClick={() => onNavigate('admin')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        currentView === 'admin'
                          ? 'bg-[#FF8B8B] text-white shadow-xs'
                          : 'bg-[#E0F2F1] border border-[#B2DFDB] text-[#00897B] hover:bg-[#B2DFDB]/60'
                      }`}
                      title="Ir al Panel de Administración"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Panel de Tienda</span>
                    </button>
                    <div className="w-8 h-8 rounded-full border-2 border-pink-200 bg-[#F7C8D0] flex items-center justify-center text-xs font-bold text-[#D64E66]" title={user.email || 'Admin'}>
                      👑
                    </div>
                  </>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <ShieldX className="w-3 h-3" />
                    Sin rol Admin
                  </span>
                )}
                <button
                  id="header-logout-btn"
                  onClick={async () => {
                    await logout();
                    onNavigate('home');
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-[#8E8D8A] hover:text-[#D64E66] hover:bg-pink-50 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : !isGuestMesaView ? (
              <button
                id="header-admin-login-btn"
                onClick={() => onNavigate('admin')}
                className="px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold bg-[#FDFBF7] text-[#5D5C5B] hover:bg-white hover:text-[#FF8B8B] border border-gray-200 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-[#FF8B8B]" />
                <span>Acceso Tienda</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('home')}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FAF7F2] text-[#6C7086] hover:text-[#4A4E69] hover:bg-[#F2EAE0] border border-[#E2D9CF] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Agu Agu</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

