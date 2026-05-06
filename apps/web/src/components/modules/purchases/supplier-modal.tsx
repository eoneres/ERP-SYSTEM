'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/use-purchases';
import type { Supplier } from '@/lib/api/purchases.api';

interface Props {
  open:    boolean;
  onClose: () => void;
  supplier?: Supplier | null;
}

interface FormValues {
  name:         string;
  type:         string;
  document:     string;
  email:        string;
  phone:        string;
  contactName:  string;
  address:      string;
  city:         string;
  state:        string;
  zipCode:      string;
  paymentTerms: string;
  notes:        string;
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

export function SupplierModal({ open, onClose, supplier }: Props) {
  const isEdit = !!supplier;
  const create = useCreateSupplier();
  const update = useUpdateSupplier();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '', type: 'company', document: '', email: '',
      phone: '', contactName: '', address: '', city: '',
      state: '', zipCode: '', paymentTerms: '', notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset(supplier
        ? {
            name:         supplier.name         ?? '',
            type:         supplier.type         ?? 'company',
            document:     supplier.document     ?? '',
            email:        supplier.email        ?? '',
            phone:        supplier.phone        ?? '',
            contactName:  supplier.contactName  ?? '',
            address:      supplier.address      ?? '',
            city:         supplier.city         ?? '',
            state:        supplier.state        ?? '',
            zipCode:      supplier.zipCode      ?? '',
            paymentTerms: supplier.paymentTerms ?? '',
            notes:        supplier.notes        ?? '',
          }
        : {
            name: '', type: 'company', document: '', email: '',
            phone: '', contactName: '', address: '', city: '',
            state: '', zipCode: '', paymentTerms: '', notes: '',
          }
      );
    }
  }, [open, supplier, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      document:     values.document     || undefined,
      email:        values.email        || undefined,
      phone:        values.phone        || undefined,
      contactName:  values.contactName  || undefined,
      address:      values.address      || undefined,
      city:         values.city         || undefined,
      state:        values.state        || undefined,
      zipCode:      values.zipCode      || undefined,
      paymentTerms: values.paymentTerms || undefined,
      notes:        values.notes        || undefined,
    };

    if (isEdit) {
      await update.mutateAsync({ id: supplier!.id, data: payload });
    } else {
      await create.mutateAsync(payload as any);
    }
    onClose();
  };

  const loading = create.isPending || update.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome e Tipo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Nome / Razão Social <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('name', { required: true })}
              placeholder="Nome do fornecedor"
              error={errors.name ? 'Obrigatório' : undefined}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Tipo</label>
            <select {...register('type')} className={fieldClass}>
              <option value="company">Pessoa Jurídica</option>
              <option value="individual">Pessoa Física</option>
            </select>
          </div>
        </div>

        {/* Documento e Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">CNPJ / CPF</label>
            <Input {...register('document')} placeholder="00.000.000/0000-00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">E-mail</label>
            <Input {...register('email')} type="email" placeholder="contato@empresa.com" />
          </div>
        </div>

        {/* Telefone e Contato */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Telefone</label>
            <Input {...register('phone')} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Nome do Contato</label>
            <Input {...register('contactName')} placeholder="Nome do responsável" />
          </div>
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Endereço</label>
          <Input {...register('address')} placeholder="Rua, número, complemento" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Cidade</label>
            <Input {...register('city')} placeholder="São Paulo" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">UF</label>
            <Input {...register('state')} placeholder="SP" maxLength={2} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">CEP</label>
            <Input {...register('zipCode')} placeholder="00000-000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Condições de Pagamento</label>
            <Input {...register('paymentTerms')} placeholder="Ex: 30/60/90 dias" />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Observações</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Informações adicionais sobre o fornecedor..."
            className={fieldClass}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Salvar Alterações' : 'Criar Fornecedor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
