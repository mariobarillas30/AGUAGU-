import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { PublicMesaView } from './components/PublicMesa/PublicMesaView';
import { AdminLogin } from './components/AdminPanel/AdminLogin';
import { AdminDashboard } from './components/AdminPanel/AdminDashboard';
import { AguAguLogo } from './components/common/AguAguLogo';
import { normalizeTableSlug } from './utils/slug';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

function MainAppContent() {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();
  
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'public_mesa'>('home');
  const [activeSlug, setActiveSlug] = useState<string>('');

  // Handle URL Hash and Path routing (e.g. #mesa/mateo-2026 or /mesa/mateo-2026)
  useEffect(() => {
    const parseUrlRoute = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (hash.startsWith('#mesa/')) {
        const rawSlug = hash.replace('#mesa/', '').trim();
        const slug = normalizeTableSlug(rawSlug);
        if (slug) {
          setActiveSlug(slug);
          setCurrentView('public_mesa');
          return;
        }
      } else if (hash === '#admin') {
        setCurrentView('admin');
        return;
      }

      // Check pathname fallback
      if (pathname.startsWith('/mesa/')) {
        const rawSlug = pathname.replace('/mesa/', '').trim();
        const slug = normalizeTableSlug(rawSlug);
        if (slug) {
          setActiveSlug(slug);
          setCurrentView('public_mesa');
          return;
        }
      } else if (pathname === '/admin') {
        setCurrentView('admin');
        return;
      }

      // Default fallback
      setCurrentView('home');
      setActiveSlug('');
    };

    parseUrlRoute();
    window.addEventListener('hashchange', parseUrlRoute);
    return () => window.removeEventListener('hashchange', parseUrlRoute);
  }, []);

  const navigateTo = (view: 'home' | 'admin' | 'public_mesa', slug?: string) => {
    setCurrentView(view);
    if (view === 'public_mesa' && slug) {
      const cleanSlug = normalizeTableSlug(slug);
      setActiveSlug(cleanSlug);
      window.location.hash = `#mesa/${cleanSlug}`;
    } else if (view === 'admin') {
      window.location.hash = '#admin';
    } else {
      window.location.hash = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#5D5C5B] selection:bg-[#FF8B8B]/25 selection:text-[#4A4A4A]">
      {/* Navigation Header */}
      <Header
        currentView={currentView}
        onNavigate={navigateTo}
        activeSlug={activeSlug}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <Home
            onNavigate={navigateTo}
          />
        )}

        {currentView === 'public_mesa' && activeSlug && (
          <PublicMesaView
            slug={activeSlug}
            onNavigateHome={() => navigateTo('home')}
          />
        )}

        {currentView === 'admin' && (
          <div className="py-6">
            {authLoading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-[#A8D8EA] border-t-[#FF8B8B] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-[#8E8D8A]">Verificando permisos de administración...</p>
              </div>
            ) : !user ? (
              <AdminLogin />
            ) : isAdmin ? (
              <AdminDashboard />
            ) : (
              /* Authenticated but not an administrator */
              <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-red-100 shadow-md text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#4A4A4A] mb-2">
                  Acceso Restringido
                </h2>
                <p className="text-xs text-[#8E8D8A] mb-4 leading-relaxed">
                  Has iniciado sesión como <strong className="text-[#4A4A4A]">{user.email || user.uid}</strong>, pero esta cuenta no cuenta con privilegios de administrador para la tienda <strong>Agu Agu</strong>.
                </p>
                <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-gray-100 text-xs text-[#5D5C5B] mb-6 text-left">
                  <p className="font-bold text-[#4A4A4A] mb-1">¿Qué puedes hacer?</p>
                  <p className="text-[11px] text-[#8E8D8A]">
                    Inicia sesión con la cuenta de correo oficial autorizada de la tienda o contacta al administrador del sistema.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={async () => {
                      await logout();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                  <button
                    onClick={() => navigateTo('home')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FAF7F2] text-[#5D5C5B] font-bold text-xs hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-gray-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Inicio
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Boutique Footer */}
      <footer className="mt-auto border-t border-gray-100 bg-white/85 backdrop-blur-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="cursor-pointer" onClick={() => navigateTo('home')}>
              <AguAguLogo size="sm" showText={true} />
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[#8E8D8A]">
              <button
                onClick={() => navigateTo('home')}
                className="hover:text-[#FF8B8B] transition-colors cursor-pointer"
              >
                Inicio
              </button>
              {user && isAdmin ? (
                <button
                  onClick={() => navigateTo('admin')}
                  className="hover:text-[#FF8B8B] transition-colors cursor-pointer text-[#00897B] font-bold"
                >
                  Panel de Tienda (Admin)
                </button>
              ) : user && !isAdmin ? (
                <button
                  onClick={async () => {
                    await logout();
                    navigateTo('home');
                  }}
                  className="hover:text-red-500 transition-colors cursor-pointer text-red-500"
                >
                  Cerrar Sesión ({user.email?.split('@')[0]})
                </button>
              ) : currentView !== 'public_mesa' ? (
                <button
                  onClick={() => navigateTo('admin')}
                  className="hover:text-[#FF8B8B] transition-colors cursor-pointer"
                >
                  Acceso Tienda
                </button>
              ) : null}
            </div>

            <p className="text-xs text-[#8E8D8A]">
              Hecho con amor para momentos inolvidables ✨
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

