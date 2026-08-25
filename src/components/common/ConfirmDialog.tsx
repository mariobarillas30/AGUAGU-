import React from 'react';
import { AlertTriangle, Trash2, Check, X, RefreshCw, Sparkles } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'teal';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  itemName,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-50 text-red-500 border border-red-100',
          Icon: Trash2,
          btnBg: 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200',
        };
      case 'teal':
        return {
          iconBg: 'bg-[#E0F2F1] text-[#00897B] border border-[#B2DFDB]',
          Icon: Sparkles,
          btnBg: 'bg-[#00897B] hover:bg-[#00796B] text-white shadow-sm shadow-teal-200',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-[#F7C8D0]/30 text-[#D64E66] border border-[#F7C8D0]',
          Icon: AlertTriangle,
          btnBg: 'bg-[#E58C8A] hover:bg-[#d67b79] text-white shadow-sm shadow-pink-200',
        };
    }
  };

  const currentVariant = getVariantStyles();
  const IconComponent = currentVariant.Icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-3xl border border-[#F2EAE0] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${currentVariant.iconBg}`}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-lg text-[#4A4E69] leading-snug">
              {title}
            </h3>
            <p className="text-xs text-[#8C90A4] mt-1.5 leading-relaxed">
              {message}
            </p>

            {itemName && (
              <div className="mt-3 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFC8] text-xs font-semibold text-[#4A4E69] truncate">
                "{itemName}"
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#F2EAE0] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-[#E2D9CF] text-[#6C7086] text-xs font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 ${currentVariant.btnBg}`}
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isLoading ? 'Procesando...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
