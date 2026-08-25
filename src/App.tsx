import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { PublicMesaView } from './components/PublicMesa/PublicMesaView';
import { AdminLogin } from './components/AdminPanel/AdminLogin';
import { AdminDashboard } from './components/AdminPanel/AdminDashboard';
import { AguAguLogo } from './components/common/AguAguLogo';

function MainAppContent() {
  const { user, loading: authLoading } = useAuth();
  
  const [currentView, setCurrentView] = useState<'home' | 'admin' | 'public_mesa'>('home');
  const [activeSlug, setActiveSlug] = useState<string>('');

  // Handle URL Hash and Path routing (e.g. #mesa/mateo-2026 or /mesa/mateo-2026)
  useEffect(() => {
    const parseUrlRoute = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (hash.startsWith('#mesa/')) {
        const slug = hash.replace('#mesa/', '').trim();
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
        const slug = pathname.replace('/mesa/', '').trim();
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
      setActiveSlug(slug);
      window.location.hash = `#mesa/${slug}`;
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
            ) : user ? (
              <AdminDashboard />
            ) : (
              <AdminLogin />
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
              {user ? (
                <button
                  onClick={() => navigateTo('admin')}
                  className="hover:text-[#FF8B8B] transition-colors cursor-pointer text-[#00897B] font-bold"
                >
                  Panel de Tienda (Admin)
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
