'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showClose?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[95vw]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  showClose = true,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={closeOnOverlayClick ? onClose : undefined}
              />
            </Dialog.Overlay>

            {/* Scroll container — ocupa a viewport inteira e centraliza o modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <Dialog.Content
                asChild
                onInteractOutside={(e) => {
                  if (!closeOnOverlayClick) e.preventDefault();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    // pointer-events-auto reativa cliques no modal (o pai tem none)
                    'pointer-events-auto',
                    'w-full rounded-xl shadow-2xl',
                    'bg-[var(--surface)] border border-[var(--border)]',
                    // flex-col + max-height garante que o modal não ultrapasse a viewport
                    // e que o body tenha scroll interno quando o conteúdo for muito alto
                    'flex flex-col',
                    'max-h-[calc(100vh-2rem)]',
                    sizeMap[size],
                    size === 'full' && 'h-[calc(100vh-2rem)]',
                    className,
                  )}
                  role="dialog"
                  aria-modal="true"
                >
                  {/* Header */}
                  {(title || showClose) && (
                    <div className="flex items-start justify-between p-5 border-b border-[var(--border)] shrink-0">
                      <div>
                        {title && (
                          <Dialog.Title className="text-base font-semibold text-[var(--text)]">
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="mt-0.5 text-sm text-[var(--text-muted)]">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                      {showClose && (
                        <button
                          onClick={onClose}
                          className="ml-4 shrink-0 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
                          aria-label="Fechar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Body — scroll interno quando conteúdo exceder altura disponível */}
                  <div className="flex-1 overflow-y-auto p-5 min-h-0">
                    {children}
                  </div>

                  {/* Footer */}
                  {footer && (
                    <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border)] bg-[var(--surface-2)] rounded-b-xl shrink-0">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Modal>
  );
}
