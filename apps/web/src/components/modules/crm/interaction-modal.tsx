'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateInteraction } from '@/hooks/use-crm';

interface Props {
  open:    boolean;
  onClose: () => void;
  leadId:  string;
}

interface FormValues {
  type: string; subject: string; description: string;
  interactionDate: string; nextActionDate: string; nextActionNote: string;
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const TYPES = [
  { value: 'call',    label: '📞 Ligação' },
  { value: 'email',   label: '✉️ E-mail' },
  { value: 'meeting', label: '🤝 Reunião' },
  { value: 'note',    label: '📝 Nota' },
  { value: 'task',    label: '✅ Tarefa' },
  { value: 'other',   label: 'Outro' },
];

export function InteractionModal({ open, onClose, leadId }: Props) {
  const create = useCreateInteraction();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      const now = new Date().toISOString().slice(0, 16);
      reset({ type: 'note', subject: '', description: '', interactionDate: now, nextActionDate: '', nextActionNote: '' });
    }
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    await create.mutateAsync({
      leadId,
      type:            values.type as any,
      subject:         values.subject.trim(),
      description:     values.description.trim() || undefined,
      interactionDate: values.interactionDate     || undefined,
      nextActionDate:  values.nextActionDate       || undefined,
      nextActionNote:  values.nextActionNote.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar Interação" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Tipo</label>
            <select {...register('type')} className={fieldClass}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Data</label>
            <Input {...register('interactionDate')} type="datetime-local" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Assunto <span className="text-danger">*</span>
          </label>
          <Input
            {...register('subject', { required: 'Assunto é obrigatório' })}
            placeholder="Resumo da interação"
            error={errors.subject?.message}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Descrição</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Detalhes da conversa..."
            className={fieldClass + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Próxima Ação</label>
            <Input {...register('nextActionDate')} type="date" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">O que fazer</label>
            <Input {...register('nextActionNote')} placeholder="Enviar proposta, ligar..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}
