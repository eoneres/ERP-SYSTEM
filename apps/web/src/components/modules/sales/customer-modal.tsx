'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-sales';
import type { Customer } from '@/lib/api/sales.api';

interface Props {
  open:      boolean;
  onClose:   () => void;
  customer?: Customer | null;
}

interface FormValues {
  name: string; type: string; email: string; phone: string;
  document: string; address: string; city: string; state: string; zipCode: string; notes: string;
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

export function CustomerModal({ open, onClose, customer }: Props) {
  const isEdit = !!customer;
  const create = useCreateCustomer();
  const update = useUpdateCustomer();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        name:     customer?.name     ?? '',
        type:     customer?.type     ?? 'individual',
        email:    customer?.email    ?? '',
        phone:    customer?.phone    ?? '',
        document: customer?.document ?? '',
        address:  customer?.address  ?? '',
        city:     customer?.city     ?? '',
        state:    customer?.state    ?? '',
        zipCode:  customer?.zipCode  ?? '',
        notes:    customer?.notes    ?? '',
      });
    }
  }, [open, customer, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:     values.name.trim(),
      type:     values.type as any,
      email:    values.email.trim()    || undefined,
      phone:    values.phone.trim()    || undefined,
      document: values.document.trim() || undefined,
      address:  values.address.trim()  || undefined,
      city:     values.city.trim()     || undefined,
      state:    values.state.trim()    || undefined,
      zipCode:  values.zipCode.trim()  || undefined,
      notes:    values.notes.trim()    || undefined,
    };
    if (isEdit) {
      await update.mutateAsync({ id: customer!.id, data: payload });
    } else {
      await create.mutateAsync(payload as any);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Cliente' : 'Novo Cliente'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Nome <span className="text-danger">*</span>
          </label>
          <Input
            {...register('name', { required: 'Nome é obrigatório' })}
            placeholder="Nome completo ou razão social"
            error={errors.name?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Tipo</label>
            <select {...register('type')} className={fieldClass}>
              <option value="individual">Pessoa Física</option>
              <option value="company">Pessoa Jurídica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CPF / CNPJ</label>
            <Input {...register('document')} placeholder="000.000.000-00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">E-mail</label>
            <Input {...register('email')} type="email" placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Telefone</label>
            <Input {...register('phone')} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Endereço</label>
          <Input {...register('address')} placeholder="Rua, número, complemento" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CEP</label>
            <Input {...register('zipCode')} placeholder="00000-000" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cidade</label>
            <Input {...register('city')} placeholder="São Paulo" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">UF</label>
            <Input {...register('state')} placeholder="SP" maxLength={2} />
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
            {isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
