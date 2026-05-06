'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateProduct, useUpdateProduct, useProductCategories } from '@/hooks/use-inventory';
import type { Product } from '@/lib/api/inventory.api';

const UNITS = [
  { value: 'unit', label: 'Unidade' },
  { value: 'kg',   label: 'Quilograma (kg)' },
  { value: 'g',    label: 'Grama (g)' },
  { value: 'l',    label: 'Litro (l)' },
  { value: 'ml',   label: 'Mililitro (ml)' },
  { value: 'm',    label: 'Metro (m)' },
  { value: 'cm',   label: 'Centímetro (cm)' },
  { value: 'box',  label: 'Caixa' },
  { value: 'pack', label: 'Pacote' },
];

interface Props {
  open:    boolean;
  onClose: () => void;
  product?: Product | null;
}

interface FormValues {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  status: string;
  costPrice: string;
  salePrice: string;
  stockQuantity: string;
  minStock: string;
  maxStock: string;
  location: string;
  description: string;
}

export function ProductModal({ open, onClose, product }: Props) {
  const isEdit = !!product;
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { data: categories = [] } = useProductCategories();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        name:          product?.name          ?? '',
        sku:           product?.sku           ?? '',
        barcode:       product?.barcode       ?? '',
        category:      product?.category      ?? '',
        brand:         product?.brand         ?? '',
        unit:          product?.unit          ?? 'unit',
        status:        product?.status        ?? 'active',
        costPrice:     product?.costPrice     != null ? String(product.costPrice)     : '',
        salePrice:     product?.salePrice     != null ? String(product.salePrice)     : '',
        stockQuantity: product?.stockQuantity != null ? String(product.stockQuantity) : '0',
        minStock:      product?.minStock      != null ? String(product.minStock)      : '0',
        maxStock:      product?.maxStock      != null ? String(product.maxStock)      : '',
        location:      product?.location      ?? '',
        description:   product?.description   ?? '',
      });
    }
  }, [open, product, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:          values.name.trim(),
      sku:           values.sku.trim()      || undefined,
      barcode:       values.barcode.trim()  || undefined,
      category:      values.category.trim() || undefined,
      brand:         values.brand.trim()    || undefined,
      unit:          values.unit as any,
      status:        values.status as any,
      costPrice:     values.costPrice     ? parseFloat(values.costPrice)     : 0,
      salePrice:     values.salePrice     ? parseFloat(values.salePrice)     : 0,
      stockQuantity: values.stockQuantity ? parseFloat(values.stockQuantity) : 0,
      minStock:      values.minStock      ? parseFloat(values.minStock)      : 0,
      maxStock:      values.maxStock      ? parseFloat(values.maxStock)      : undefined,
      location:      values.location.trim()     || undefined,
      description:   values.description.trim()  || undefined,
    };

    if (isEdit) {
      await update.mutateAsync({ id: product!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  const fieldClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Produto' : 'Novo Produto'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Nome */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Nome do produto <span className="text-danger">*</span>
          </label>
          <Input
            {...register('name', { required: 'Nome é obrigatório' })}
            placeholder="Ex: Camiseta Básica Branca"
            error={errors.name?.message}
          />
        </div>

        {/* SKU + Barcode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">SKU</label>
            <Input {...register('sku')} placeholder="Ex: CAM-BRNC-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Código de Barras</label>
            <Input {...register('barcode')} placeholder="EAN-13" />
          </div>
        </div>

        {/* Categoria + Marca */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Categoria</label>
            <input
              {...register('category')}
              list="category-list"
              placeholder="Ex: Vestuário"
              className={fieldClass}
            />
            <datalist id="category-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Marca</label>
            <Input {...register('brand')} placeholder="Ex: Nike" />
          </div>
        </div>

        {/* Unidade + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Unidade</label>
            <select {...register('unit')} className={fieldClass}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Status</label>
            <select {...register('status')} className={fieldClass}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="draft">Rascunho</option>
            </select>
          </div>
        </div>

        {/* Preços */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Preços
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Preço de Custo (R$)
              </label>
              <Input
                {...register('costPrice')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Preço de Venda (R$)
              </label>
              <Input
                {...register('salePrice')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        {/* Estoque */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Estoque
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                {isEdit ? 'Qtd. Atual' : 'Qtd. Inicial'}
              </label>
              <Input
                {...register('stockQuantity')}
                type="number"
                step="0.001"
                min="0"
                placeholder="0"
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                  Use "Movimentações" para alterar o saldo
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Estoque Mínimo
              </label>
              <Input {...register('minStock')} type="number" step="0.001" min="0" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Estoque Máximo
              </label>
              <Input {...register('maxStock')} type="number" step="0.001" min="0" placeholder="—" />
            </div>
          </div>
        </div>

        {/* Localização */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Localização no Depósito
          </label>
          <Input {...register('location')} placeholder="Ex: Corredor A, Prateleira 3" />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Descrição
          </label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Informações adicionais sobre o produto..."
            className={fieldClass + ' resize-none'}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
