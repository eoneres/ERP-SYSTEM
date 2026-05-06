'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateMovement, useWarehouses, useProducts } from '@/hooks/use-inventory';
import type { Product, MovementType } from '@/lib/api/inventory.api';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOVEMENT_TYPES: { value: MovementType; label: string; icon: any; color: string; description: string }[] = [
  { value: 'in',     label: 'Entrada',   icon: ArrowDownCircle,  color: 'text-emerald-500', description: 'Compra, recebimento, devolução' },
  { value: 'out',    label: 'Saída',     icon: ArrowUpCircle,    color: 'text-red-500',     description: 'Venda, consumo, envio' },
  { value: 'adjust', label: 'Ajuste',    icon: SlidersHorizontal,color: 'text-blue-500',    description: 'Correção de inventário' },
  { value: 'loss',   label: 'Perda',     icon: RefreshCw,        color: 'text-orange-500',  description: 'Quebra, vencimento, extravio' },
];

const REASONS: Record<MovementType, { value: string; label: string }[]> = {
  in:       [{ value: 'purchase', label: 'Compra' }, { value: 'return_in', label: 'Devolução de Cliente' }, { value: 'production', label: 'Produção' }, { value: 'other', label: 'Outro' }],
  out:      [{ value: 'sale', label: 'Venda' }, { value: 'return_out', label: 'Devolução ao Fornecedor' }, { value: 'production', label: 'Consumo/Produção' }, { value: 'other', label: 'Outro' }],
  adjust:   [{ value: 'adjustment', label: 'Inventário/Contagem' }, { value: 'other', label: 'Outro' }],
  loss:     [{ value: 'loss', label: 'Perda/Quebra' }, { value: 'other', label: 'Outro' }],
  transfer: [{ value: 'transfer', label: 'Transferência' }],
  return:   [{ value: 'return_in', label: 'Devolução' }],
};

interface Props {
  open:       boolean;
  onClose:    () => void;
  product?:   Product | null; // se passado, o select de produto fica fixo
  defaultType?: MovementType;
}

interface FormValues {
  productId:    string;
  warehouseId:  string;
  type:         MovementType;
  reason:       string;
  quantity:     string;
  unitCost:     string;
  movementDate: string;
  referenceNumber: string;
  counterpartName: string;
  notes:        string;
}

export function MovementModal({ open, onClose, product, defaultType = 'in' }: Props) {
  const createMovement = useCreateMovement();
  const { data: warehouses = [] } = useWarehouses();
  const { data: productsData }    = useProducts({ limit: 200 });
  const products = productsData?.data ?? [];

  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>();

  const selectedType = watch('type') as MovementType;

  useEffect(() => {
    if (open) {
      reset({
        productId:       product?.id ?? '',
        warehouseId:     '',
        type:            defaultType,
        reason:          '',
        quantity:        '',
        unitCost:        product?.costPrice != null ? String(product.costPrice) : '',
        movementDate:    today,
        referenceNumber: '',
        counterpartName: '',
        notes:           '',
      });
    }
  }, [open, product, defaultType, today, reset]);

  // Reset reason when type changes
  useEffect(() => {
    setValue('reason', '');
  }, [selectedType, setValue]);

  const onSubmit = async (values: FormValues) => {
    await createMovement.mutateAsync({
      productId:       values.productId,
      warehouseId:     values.warehouseId || undefined,
      type:            values.type,
      reason:          (values.reason || undefined) as any,
      quantity:        parseFloat(values.quantity),
      unitCost:        values.unitCost ? parseFloat(values.unitCost) : undefined,
      movementDate:    values.movementDate ? `${values.movementDate}T00:00:00Z` : undefined,
      referenceNumber: values.referenceNumber || undefined,
      counterpartName: values.counterpartName || undefined,
      notes:           values.notes || undefined,
    });
    onClose();
  };

  const fieldClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

  const reasons = REASONS[selectedType] ?? REASONS.in;
  const selectedTypeConfig = MOVEMENT_TYPES.find((t) => t.value === selectedType);

  return (
    <Modal open={open} onClose={onClose} title="Registrar Movimentação" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Tipo de movimentação */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">
            Tipo de Movimentação
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MOVEMENT_TYPES.map((t) => {
              const Icon = t.icon;
              const active = selectedType === t.value;
              return (
                <label
                  key={t.value}
                  className={cn(
                    'flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all',
                    active
                      ? 'border-primary-500 bg-primary-500/8'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-2)]',
                  )}
                >
                  <input
                    type="radio"
                    value={t.value}
                    {...register('type', { required: true })}
                    className="sr-only"
                  />
                  <Icon className={cn('h-4 w-4 shrink-0', t.color)} />
                  <div>
                    <p className={cn('text-xs font-semibold', active ? 'text-[var(--text)]' : 'text-[var(--text-muted)]')}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-subtle)]">{t.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Produto */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Produto <span className="text-danger">*</span>
          </label>
          {product ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
              <span className="text-sm text-[var(--text)] font-medium">{product.name}</span>
              {product.sku && <span className="text-xs text-[var(--text-subtle)]">#{product.sku}</span>}
              <span className="ml-auto text-xs font-medium text-emerald-600">
                {product.stockQuantity} {product.unit}
              </span>
            </div>
          ) : (
            <select
              {...register('productId', { required: 'Selecione um produto' })}
              className={fieldClass}
            >
              <option value="">Selecione um produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.sku ? ` [${p.sku}]` : ''} — {p.stockQuantity} {p.unit}
                </option>
              ))}
            </select>
          )}
          {errors.productId && (
            <p className="text-xs text-danger mt-1">{errors.productId.message}</p>
          )}
        </div>

        {/* Quantidade + Custo Unitário */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Quantidade <span className="text-danger">*</span>
              {selectedType === 'adjust' && (
                <span className="ml-1 text-blue-500">(novo saldo)</span>
              )}
            </label>
            <Input
              {...register('quantity', {
                required: 'Informe a quantidade',
                min: { value: 0.001, message: 'Quantidade deve ser maior que zero' },
              })}
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
              error={errors.quantity?.message}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Custo Unitário (R$)
            </label>
            <Input
              {...register('unitCost')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Motivo + Data */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Motivo</label>
            <select {...register('reason')} className={fieldClass}>
              <option value="">Selecione...</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Data</label>
            <input {...register('movementDate')} type="date" className={fieldClass} />
          </div>
        </div>

        {/* Depósito + Referência */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Depósito</label>
            <select {...register('warehouseId')} className={fieldClass}>
              <option value="">Padrão</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' ★' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nº Referência</label>
            <Input {...register('referenceNumber')} placeholder="NF, pedido..." />
          </div>
        </div>

        {/* Fornecedor/Cliente */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            {selectedType === 'in' ? 'Fornecedor' : 'Cliente / Destino'}
          </label>
          <Input {...register('counterpartName')} placeholder="Nome do fornecedor ou cliente" />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Notas adicionais..."
            className={fieldClass + ' resize-none'}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Registrar Movimentação
          </Button>
        </div>
      </form>
    </Modal>
  );
}
