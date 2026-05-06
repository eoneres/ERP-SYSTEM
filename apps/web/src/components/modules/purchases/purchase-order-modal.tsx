'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreatePurchaseOrder, useUpdatePurchaseOrder, useSuppliers } from '@/hooks/use-purchases';
import { formatCurrency } from '@/lib/utils';
import type { PurchaseOrder } from '@/lib/api/purchases.api';

interface Props {
  open:    boolean;
  onClose: () => void;
  order?:  PurchaseOrder | null;
}

interface ItemForm {
  productName: string;
  productSku:  string;
  quantity:    string;
  unitCost:    string;
  notes:       string;
}

interface FormValues {
  supplierId:      string;
  paymentMethod:   string;
  orderDate:       string;
  expectedDate:    string;
  dueDate:         string;
  discount:        string;
  shipping:        string;
  referenceNumber: string;
  notes:           string;
  items:           ItemForm[];
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const PAYMENT_METHODS = [
  { value: 'boleto',      label: 'Boleto'          },
  { value: 'pix',         label: 'PIX'             },
  { value: 'transfer',    label: 'Transferência'   },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'cash',        label: 'Dinheiro'        },
  { value: 'other',       label: 'Outro'           },
];

const today = () => new Date().toISOString().split('T')[0];

export function PurchaseOrderModal({ open, onClose, order }: Props) {
  const isEdit = !!order;
  const create = useCreatePurchaseOrder();
  const update = useUpdatePurchaseOrder();

  const { data: suppliersData } = useSuppliers({ limit: 500, isActive: true });
  const suppliers = suppliersData?.data ?? [];

  const { register, handleSubmit, reset, control, watch, formState: { errors } } =
    useForm<FormValues>({
      defaultValues: {
        supplierId: '', paymentMethod: '', orderDate: today(),
        expectedDate: '', dueDate: '', discount: '0', shipping: '0',
        referenceNumber: '', notes: '',
        items: [{ productName: '', productSku: '', quantity: '1', unitCost: '0', notes: '' }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchItems    = watch('items');
  const watchDiscount = watch('discount');
  const watchShipping = watch('shipping');

  const subtotal = watchItems.reduce((s, i) => {
    const q = parseFloat(i.quantity) || 0;
    const c = parseFloat(i.unitCost) || 0;
    return s + q * c;
  }, 0);
  const discount = parseFloat(watchDiscount) || 0;
  const shipping = parseFloat(watchShipping) || 0;
  const total    = subtotal - discount + shipping;

  useEffect(() => {
    if (open) {
      reset(order
        ? {
            supplierId:      order.supplierId      ?? '',
            paymentMethod:   order.paymentMethod   ?? '',
            orderDate:       order.orderDate?.split('T')[0] ?? today(),
            expectedDate:    order.expectedDate    ?? '',
            dueDate:         order.dueDate         ?? '',
            discount:        String(order.discount ?? 0),
            shipping:        String(order.shipping ?? 0),
            referenceNumber: order.referenceNumber ?? '',
            notes:           order.notes           ?? '',
            items: order.items?.length
              ? order.items.map((i) => ({
                  productName: i.productName,
                  productSku:  i.productSku  ?? '',
                  quantity:    String(i.quantity),
                  unitCost:    String(i.unitCost),
                  notes:       i.notes       ?? '',
                }))
              : [{ productName: '', productSku: '', quantity: '1', unitCost: '0', notes: '' }],
          }
        : {
            supplierId: '', paymentMethod: '', orderDate: today(),
            expectedDate: '', dueDate: '', discount: '0', shipping: '0',
            referenceNumber: '', notes: '',
            items: [{ productName: '', productSku: '', quantity: '1', unitCost: '0', notes: '' }],
          }
      );
    }
  }, [open, order, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      supplierId:      values.supplierId      || undefined,
      paymentMethod:   values.paymentMethod   || undefined,
      orderDate:       values.orderDate       || undefined,
      expectedDate:    values.expectedDate    || undefined,
      dueDate:         values.dueDate         || undefined,
      discount:        parseFloat(values.discount) || 0,
      shipping:        parseFloat(values.shipping) || 0,
      referenceNumber: values.referenceNumber || undefined,
      notes:           values.notes           || undefined,
      items: values.items.map((i) => ({
        productName: i.productName,
        productSku:  i.productSku  || undefined,
        quantity:    parseFloat(i.quantity),
        unitCost:    parseFloat(i.unitCost),
        notes:       i.notes || undefined,
      })),
    };

    if (isEdit) {
      await update.mutateAsync({ id: order!.id, data: payload });
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
      title={isEdit ? `Editar Ordem ${order?.orderNumber}` : 'Nova Ordem de Compra'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Fornecedor e Forma de Pagamento */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Fornecedor</label>
            <select {...register('supplierId')} className={fieldClass}>
              <option value="">Selecionar fornecedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Forma de Pagamento</label>
            <select {...register('paymentMethod')} className={fieldClass}>
              <option value="">Selecionar...</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Data do Pedido <span className="text-red-500">*</span>
            </label>
            <Input type="date" {...register('orderDate', { required: true })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Previsão de Entrega</label>
            <Input type="date" {...register('expectedDate')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Vencimento</label>
            <Input type="date" {...register('dueDate')} />
          </div>
        </div>

        {/* NF e Notas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Número da NF (fornecedor)</label>
            <Input {...register('referenceNumber')} placeholder="NF-0001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Observações</label>
            <Input {...register('notes')} placeholder="Observações gerais..." />
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[var(--text)]">Itens da Ordem</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productName: '', productSku: '', quantity: '1', unitCost: '0', notes: '' })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Item
            </Button>
          </div>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-[var(--text-muted)]">
              <span className="col-span-4">Produto</span>
              <span className="col-span-2">SKU</span>
              <span className="col-span-2 text-right">Qtd</span>
              <span className="col-span-2 text-right">Custo Unit.</span>
              <span className="col-span-1 text-right">Total</span>
              <span className="col-span-1" />
            </div>

            {fields.map((field, idx) => {
              const q = parseFloat(watchItems[idx]?.quantity) || 0;
              const c = parseFloat(watchItems[idx]?.unitCost) || 0;
              const lineTotal = q * c;

              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-[var(--surface-2)] rounded-lg p-2">
                  <div className="col-span-4">
                    <input
                      {...register(`items.${idx}.productName`, { required: true })}
                      placeholder="Nome do produto"
                      className={`${fieldClass} ${errors.items?.[idx]?.productName ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${idx}.productSku`)}
                      placeholder="SKU"
                      className={fieldClass}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${idx}.quantity`)}
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="1"
                      className={`${fieldClass} text-right`}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      {...register(`items.${idx}.unitCost`)}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      className={`${fieldClass} text-right`}
                    />
                  </div>
                  <div className="col-span-1 text-right text-sm font-medium text-[var(--text)]">
                    {formatCurrency(lineTotal)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => fields.length > 1 && remove(idx)}
                      disabled={fields.length <= 1}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totais */}
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-muted)]">
                <span>Desconto</span>
                <div className="w-28">
                  <input
                    {...register('discount')}
                    type="number"
                    step="0.01"
                    min="0"
                    className={`${fieldClass} text-right py-1 text-xs`}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-[var(--text-muted)]">
                <span>Frete</span>
                <div className="w-28">
                  <input
                    {...register('shipping')}
                    type="number"
                    step="0.01"
                    min="0"
                    className={`${fieldClass} text-right py-1 text-xs`}
                  />
                </div>
              </div>
              <div className="flex justify-between font-semibold text-[var(--text)] text-base pt-2 border-t border-[var(--border)]">
                <span>Total</span>
                <span className="text-primary-500">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Salvar Alterações' : 'Criar Ordem'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
