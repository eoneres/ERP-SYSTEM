'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Calendar, Tag, FileText, User, Hash } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccounts, useCategories, useCreateTransaction, useUpdateTransaction } from '@/hooks/use-finance';
import type { Transaction } from '@/lib/api/finance.api';

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória').max(255),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  type: z.enum(['income', 'expense', 'transfer']),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  status: z.enum(['pending', 'paid', 'scheduled', 'cancelled']).optional(),
  paymentDate: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  counterpartName: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  defaultType?: 'income' | 'expense';
}

export function TransactionModal({ open, onClose, transaction, defaultType = 'expense' }: Props) {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const isEditing = !!transaction;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, status: 'pending' },
  });

  useEffect(() => {
    if (open) {
      if (transaction) {
        reset({
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          dueDate: transaction.dueDate?.split('T')[0],
          status: transaction.status as any,
          paymentDate: transaction.paymentDate?.split('T')[0],
          accountId: transaction.account?.id,
          categoryId: transaction.category?.id,
          counterpartName: transaction.counterpartName,
          referenceNumber: transaction.referenceNumber,
          notes: transaction.notes,
        });
      } else {
        reset({ type: defaultType, status: 'pending' });
      }
    }
  }, [open, transaction, defaultType, reset]);

  const type = watch('type');
  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both',
  );

  const onSubmit = async (values: FormValues) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id: transaction!.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Transação' : 'Nova Transação'}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            loading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isEditing ? 'Salvar alterações' : 'Criar transação'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {(['expense', 'income', 'transfer'] as const).map((t) => {
              const labels = { expense: '↑ Despesa', income: '↓ Receita', transfer: '⇄ Transferência' };
              const colors = {
                expense: type === 'expense' ? 'border-danger bg-danger/10 text-danger' : '',
                income: type === 'income' ? 'border-success bg-success/10 text-success' : '',
                transfer: type === 'transfer' ? 'border-primary-500 bg-primary-500/10 text-primary-500' : '',
              };
              return (
                <label
                  key={t}
                  className={`flex items-center justify-center px-3 py-2 rounded-md border cursor-pointer text-sm font-medium transition-all
                    ${type === t ? colors[t] : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'}`}
                >
                  <input type="radio" value={t} className="sr-only" {...register('type')} />
                  {labels[t]}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input
              label="Descrição"
              placeholder="Ex: Pagamento de fornecedor..."
              leftIcon={<FileText />}
              error={errors.description?.message}
              {...register('description')}
            />
          </div>

          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            leftIcon={<DollarSign />}
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input
            label="Vencimento"
            type="date"
            leftIcon={<Calendar />}
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />

          {/* Account */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Conta</label>
            <select
              className="input-base h-9"
              {...register('accountId')}
            >
              <option value="">Selecionar conta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Categoria</label>
            <select className="input-base h-9" {...register('categoryId')}>
              <option value="">Selecionar categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Status</label>
            <select className="input-base h-9" {...register('status')}>
              <option value="pending">Pendente</option>
              <option value="paid">{type === 'income' ? 'Recebido' : 'Pago'}</option>
              <option value="scheduled">Agendado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <Input
            label={type === 'income' ? 'Data de recebimento' : 'Data de pagamento'}
            type="date"
            leftIcon={<Calendar />}
            {...register('paymentDate')}
          />

          <Input
            label="Cliente / Fornecedor"
            placeholder="Nome da contraparte"
            leftIcon={<User />}
            {...register('counterpartName')}
          />

          <Input
            label="Nº de referência"
            placeholder="Nota fiscal, boleto..."
            leftIcon={<Hash />}
            {...register('referenceNumber')}
          />

          <div className="col-span-2">
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">Observações</label>
            <textarea
              rows={2}
              placeholder="Informações adicionais..."
              className="input-base resize-none"
              {...register('notes')}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
