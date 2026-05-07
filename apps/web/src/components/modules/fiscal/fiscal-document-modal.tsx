'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFiscalSeries, useIssueDocument } from '@/hooks/use-fiscal';

interface Props {
  open:     boolean;
  onClose:  () => void;
  orderId?: string;
  orderTotal?: number;
  recipientName?: string;
  recipientDocument?: string;
}

interface FormValues {
  seriesId: string; totalAmount: string;
  recipientName: string; recipientDocument: string; notes: string;
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

export function FiscalDocumentModal({ open, onClose, orderId, orderTotal, recipientName, recipientDocument }: Props) {
  const { data: seriesList = [] } = useFiscalSeries();
  const issue = useIssueDocument();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        seriesId:          (seriesList as any[])[0]?.id ?? '',
        totalAmount:       orderTotal != null ? String(orderTotal) : '',
        recipientName:     recipientName     ?? '',
        recipientDocument: recipientDocument ?? '',
        notes:             '',
      });
    }
  }, [open, seriesList, orderTotal, recipientName, recipientDocument, reset]);

  const onSubmit = async (values: FormValues) => {
    await issue.mutateAsync({
      seriesId:          values.seriesId,
      orderId:           orderId,
      totalAmount:       Number(values.totalAmount) || 0,
      recipientName:     values.recipientName.trim()     || undefined,
      recipientDocument: values.recipientDocument.trim() || undefined,
      notes:             values.notes.trim()             || undefined,
    });
    onClose();
  };

  const series = seriesList as any[];

  return (
    <Modal open={open} onClose={onClose} title="Emitir Documento Fiscal" size="md">
      {series.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">Nenhuma série fiscal cadastrada.</p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">Acesse Fiscal → Séries para criar uma.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Série <span className="text-danger">*</span>
            </label>
            <select {...register('seriesId', { required: true })} className={fieldClass}>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.documentType.toUpperCase()} — Série {s.series} (último nº {s.lastNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Valor Total (R$) <span className="text-danger">*</span>
            </label>
            <Input
              {...register('totalAmount', { required: 'Valor é obrigatório' })}
              type="number" min="0" step="0.01" placeholder="0,00"
              error={errors.totalAmount?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Destinatário</label>
              <Input {...register('recipientName')} placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CPF / CNPJ</label>
              <Input {...register('recipientDocument')} placeholder="000.000.000-00" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Informações adicionais..."
              className={fieldClass + ' resize-none'}
            />
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-xs text-amber-600 font-medium">⚠️ Documento em modo de homologação</p>
            <p className="text-xs text-amber-600/80 mt-0.5">
              Integração com SEFAZ pendente. O XML gerado é estrutural e não possui validade fiscal.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>Emitir Documento</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
