'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateQuote, useUpdateQuote } from '@/hooks/use-crm';
import type { Quote } from '@/lib/api/crm.api';

interface Props {
  open:    boolean;
  onClose: () => void;
  leadId:  string;
  quote?:  Quote | null;
}

interface FormValues {
  amount: string; discount: string; status: string;
  validUntil: string; description: string; terms: string; notes: string;
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const STATUSES = [
  { value: 'draft',    label: 'Rascunho' },
  { value: 'sent',     label: 'Enviada' },
  { value: 'accepted', label: 'Aceita' },
  { value: 'rejected', label: 'Recusada' },
  { value: 'expired',  label: 'Expirada' },
];

export function QuoteModal({ open, onClose, leadId, quote }: Props) {
  const isEdit = !!quote;
  const create = useCreateQuote();
  const update = useUpdateQuote();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        amount:      quote?.amount   != null ? String(quote.amount)   : '',
        discount:    quote?.discount != null ? String(quote.discount) : '0',
        status:      quote?.status   ?? 'draft',
        validUntil:  quote?.validUntil?.slice(0, 10) ?? '',
        description: quote?.description ?? '',
        terms:       quote?.terms       ?? '',
        notes:       quote?.notes       ?? '',
      });
    }
  }, [open, quote, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: any = {
      leadId,
      amount:      Number(values.amount),
      discount:    Number(values.discount) || 0,
      status:      values.status,
      validUntil:  values.validUntil  || undefined,
      description: values.description.trim() || undefined,
      terms:       values.terms.trim()       || undefined,
      notes:       values.notes.trim()       || undefined,
    };
    if (isEdit) {
      await update.mutateAsync({ id: quote!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Proposta' : 'Nova Proposta'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Valor (R$) <span className="text-danger">*</span>
            </label>
            <Input
              {...register('amount', { required: 'Valor é obrigatório' })}
              type="number" min="0" step="0.01" placeholder="0,00"
              error={errors.amount?.message}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Desconto (R$)</label>
            <Input {...register('discount')} type="number" min="0" step="0.01" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Status</label>
            <select {...register('status')} className={fieldClass}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Válida até</label>
          <Input {...register('validUntil')} type="date" />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Descrição</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Descreva os produtos/serviços incluídos..."
            className={fieldClass + ' resize-none'}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Termos e Condições</label>
          <textarea
            {...register('terms')}
            rows={2}
            placeholder="Condições de pagamento, prazo de entrega..."
            className={fieldClass + ' resize-none'}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Notas internas..."
            className={fieldClass + ' resize-none'}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Salvar Alterações' : 'Criar Proposta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
