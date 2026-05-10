import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useToast } from '../context';
import { cn } from '../lib';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-2xl shadow-modal border animate-slide-up',
            t.type === 'success' && 'bg-mpl-card border-green-500/40',
            t.type === 'error' && 'bg-mpl-card border-red-500/40',
            t.type === 'warning' && 'bg-mpl-card border-mpl-gold/40',
            t.type === 'info' && 'bg-mpl-card border-blue-500/40',
          )}
        >
          <div className="mt-0.5 flex-shrink-0">
            {t.type === 'success' && <CheckCircle size={16} className="text-green-400" />}
            {t.type === 'error' && <AlertCircle size={16} className="text-red-400" />}
            {t.type === 'warning' && <AlertTriangle size={16} className="text-mpl-gold" />}
            {t.type === 'info' && <Info size={16} className="text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{t.title}</p>
            {t.message && <p className="text-xs text-mpl-gray mt-0.5">{t.message}</p>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-mpl-gray hover:text-white flex-shrink-0 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className={cn('relative w-full bg-mpl-card border border-mpl-border rounded-2xl shadow-modal animate-slide-up', sizeClass)}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mpl-border">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-mpl-gray hover:text-white transition-colors p-1 rounded-lg hover:bg-mpl-border">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-mpl-border flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'gold' | 'default';
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'default' }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={variant === 'danger' ? 'btn-danger' : 'btn-gold'}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-mpl-gray leading-relaxed">{message}</p>
    </Modal>
  );
}

// ─── Override Note Dialog ─────────────────────────────────────────────────────
interface OverrideNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: string;
}

export function OverrideNoteDialog({ isOpen, onClose, onConfirm, title, description }: OverrideNoteDialogProps) {
  const [reason, setReason] = React.useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleConfirm} disabled={!reason.trim()}>
            Apply Override
          </button>
        </>
      }
    >
      {description && <p className="text-sm text-mpl-gray mb-3">{description}</p>}
      <label className="section-title">Override Reason *</label>
      <textarea
        className="input-field resize-none"
        rows={3}
        placeholder="Mandatory: describe why this override is applied..."
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      <p className="text-xs text-mpl-gray mt-1.5">⚠️ This action will be recorded in the audit log.</p>
    </Modal>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-mpl-gray opacity-40 text-4xl">{icon}</div>
      <p className="font-semibold text-mpl-off-white">{title}</p>
      {description && <p className="text-sm text-mpl-gray max-w-xs">{description}</p>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-mpl-gray mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 border-mpl-border border-t-mpl-gold animate-spin" />
    </div>
  );
}

// ─── Back Button ──────────────────────────────────────────────────────────────
import { ChevronLeft } from 'lucide-react';

export function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-mpl-gray hover:text-white transition-colors text-sm font-medium"
    >
      <ChevronLeft size={16} />
      {label}
    </button>
  );
}

// ─── Gold Divider ─────────────────────────────────────────────────────────────
export function GoldDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-mpl-gold/30 to-transparent my-4" />;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="mpl-card p-4 flex flex-col gap-1">
      <p className="section-title mb-0">{label}</p>
      <p className={cn('text-2xl font-bold', color ?? 'text-mpl-gold')}>{value}</p>
      {sub && <p className="text-xs text-mpl-gray">{sub}</p>}
    </div>
  );
}
