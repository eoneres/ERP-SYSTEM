'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateLead, useUpdateLead } from '@/hooks/use-crm';
import type { Lead } from '@/lib/api/crm.api';

interface Props {
  open:    boolean;
  onClose: () => void;
  lead?:   Lead | null;
}

interface FormValues {
  name: string; email: string; phone: string; company: string;
  position: string; stage: string; source: string;
  estimatedValue: string; probability: string;
  expectedCloseDate: string; notes: string;
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const STAGES = [
  { value: 'new',         label: 'Novo' },
  { value: 'contacted',   label: 'Contato' },
  { value: 'proposal',    label: 'Proposta' },
  { value: 'negotiation', label: 'Negociação' },
  { value: 'lost',        label: 'Perdido' },
];

const SOURCES = [
  { value: 'website',  label: 'Website' },
  { value: 'referral', label: 'Indicação' },
  { value: 'social',   label: 'Redes Sociais' },
  { value: 'email',    label: 'E-mail' },
  { value: 'phone',    label: 'Telefone' },
  { value: 'event',    label: 'Evento' },
  { value: 'other',    label: 'Outro' },
];

export function LeadModal({ open, onClose, lead }: Props) {
  const isEdit = !!lead;
  const create = useCreateLead();
  const update = useUpdateLead();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        name:              lead?.name              ?? '',
        email:             lead?.email             ?? '',
        phone:             lead?.phone             ?? '',
        company:           lead?.company           ?? '',
        position:          lead?.position          ?? '',
        stage:             lead?.stage             ?? 'new',
        source:            lead?.source            ?? '',
        estimatedValue:    lead?.estimatedValue != null ? String(lead.estimatedValue) : '',
        probability:       lead?.probability != null    ? String(lead.probability)    : '0',
        expectedCloseDate: lead?.expectedCloseDate?.slice(0, 10) ?? '',
        notes:             lead?.notes             ?? '',
      });
    }
  }, [open, lead, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: any = {
      name:              values.name.trim(),
      email:             values.email.trim()    || undefined,
      phone:             values.phone.trim()    || undefined,
      company:           values.company.trim()  || undefined,
      position:          values.position.trim() || undefined,
      stage:             values.stage           || undefined,
      source:            values.source          || undefined,
      estimatedValue:    values.estimatedValue  ? Number(values.estimatedValue)  : undefined,
      probability:       values.probability     ? Number(values.probability)     : 0,
      expectedCloseDate: values.expectedCloseDate || undefined,
      notes:             values.notes.trim()    || undefined,
    };
    if (isEdit) {
      await update.mutateAsync({ id: lead!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Lead' : 'Novo Lead'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Nome <span className="text-danger">*</span>
          </label>
          <Input
            {...register('name', { required: 'Nome é obrigatório' })}
            placeholder="Nome do contato"
            error={errors.name?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Empresa</label>
            <Input {...register('company')} placeholder="Nome da empresa" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cargo</label>
            <Input {...register('position')} placeholder="Diretor, Gerente..." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">E-mail</label>
            <Input {...register('email')} type="email" placeholder="email@empresa.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Telefone</label>
            <Input {...register('phone')} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Estágio</label>
            <select {...register('stage')} className={fieldClass}>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Origem</label>
            <select {...register('source')} className={fieldClass}>
              <option value="">Selecionar...</option>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Valor Estimado (R$)</label>
            <Input {...register('estimatedValue')} type="number" min="0" step="0.01" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Probabilidade (%)</label>
            <Input {...register('probability')} type="number" min="0" max="100" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Previsão de Fechamento</label>
            <Input {...register('expectedCloseDate')} type="date" />
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

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Salvar Alterações' : 'Criar Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
