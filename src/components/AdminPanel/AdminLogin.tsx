import React, { useState } from 'react';
import { Lock, Mail, Sparkles, LogIn, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AguAguLogo } from '../common/AguAguLogo';

interface AdminLoginProps {
  onSuccess?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const { signInWithGoogle, signInWithEmail, signInAsDemoAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithEmail(email, password);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      setError('Credenciales inválidas o usuario no registrado. Puedes usar el Acceso Rápido abajo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Ventana de acceso cerrada antes de completar el inicio de sesión.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setError('Dominio no autorizado en Firebase Console. Agrega el dominio en Firebase Authentication > Settings > Authorized domains.');
      } else {
        setError('Error al iniciar con Google (' + (err?.message || 'verifica tu conexión') + '). También puedes usar el botón de Acceso Instantáneo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setIsSubmitting(true);
    try {
      await signInAsDemoAdmin();
      onSuccess?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-md relative overflow-hidden">
      {/* Decorative top pill */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#F7C8D0]/30 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#A8D8EA]/30 rounded-full blur-2xl pointer-events-none" />

      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <AguAguLogo size="lg" showText={false} />
        </div>
        <h2 className="text-2xl font-heading font-bold text-[#4A4A4A]">
          Panel de Tienda Agu Agu
        </h2>
        <p className="text-xs text-[#8E8D8A] mt-1">
          Gestiona inventario, mesas de regalos y catálogo oficial
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-[#FFF0F0] border border-[#FFD6D6] text-xs text-[#C53030] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Access for preview testing */}
      <div className="mb-6 p-4 rounded-2xl bg-[#FDFBF7] border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4A4A4A]">
            <Sparkles className="w-4 h-4 text-[#FFEAA7]" />
            <span>Acceso Instantáneo a la Tienda</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#FF8B8B] text-white rounded-full">
            Recomendado
          </span>
        </div>
        <p className="text-xs text-[#5D5C5B] mb-3">
          Ingresa directamente como administrador de <strong>Agu Agu</strong> para gestionar mesas e inventario sin contraseñas.
        </p>
        <button
          id="btn-demo-admin-login"
          type="button"
          disabled={isSubmitting}
          onClick={handleDemoAccess}
          className="w-full py-2.5 px-4 rounded-xl bg-[#FF8B8B] text-white font-bold text-sm shadow-md shadow-pink-200/60 hover:bg-[#ff7a7a] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <KeyRound className="w-4 h-4" />
          Entrar como Administrador
        </button>
      </div>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <span className="relative bg-white px-3 text-xs text-[#8E8D8A] font-medium">
          o con credenciales
        </span>
      </div>

      {/* Google Login Button */}
      <button
        id="btn-google-login"
        type="button"
        disabled={isSubmitting}
        onClick={handleGoogleSignIn}
        className="w-full py-2.5 px-4 mb-4 rounded-xl bg-[#FDFBF7] border border-gray-200 text-[#5D5C5B] font-bold text-sm hover:bg-white hover:text-[#FF8B8B] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        Continuar con Google
      </button>

      {/* Email Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#5D5C5B] mb-1.5">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#8E8D8A] absolute left-3.5 top-3" />
            <input
              id="admin-email-input"
              type="email"
              placeholder="admin@aguagu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-[#FDFBF7] text-sm text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#5D5C5B] mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#8E8D8A] absolute left-3.5 top-3" />
            <input
              id="admin-password-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-[#FDFBF7] text-sm text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#A8D8EA]"
            />
          </div>
        </div>

        <button
          id="btn-email-login"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl bg-[#5D5C5B] text-white font-bold text-sm hover:bg-[#4A4A4A] active:scale-95 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          Iniciar Sesión
        </button>
      </form>
    </div>
  );
};
