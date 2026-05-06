'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateOrder, useUpdateOrder } from '@/hooks/use-sales';
import { useCustomers } from '@/hooks/use-sales';
import { formatCurrency } from '@/lib/utils';
import type { Order } from '@/lib/api/sales.api';

interface Props {
  open:   boolean;
  onClose: () => void;
  order?: Order | null;
}

interface ItemForm {
  productName: string;
  productSku: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  notes: string;
}

interface FormValues {
  customerId: string;
  paymentMethod: string;
  orderDate: string;
  deliveryDate: string;
  discount: string;
  shipping: string;
  shippingAddress: string;
  referenceNumber: string;
  notes: string;
  items: ItemForm[];
}

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const PAYMENT_METHODS = [
  { value: 'cash',        label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card',  label: 'Cartão de Débito' },
  { value: 'pix',         label: 'PIX' },
  { value: 'boleto',      label: 'Boleto' },
  { value: 'transfer',    label: 'Transferência' },
  { value: 'other',       label: 'Outro' },
];

export function OrderModal({ open, onClose, order }: Props) {
  const isEdit = !!order;
  const create = useCreateOrder();
  const update = useUpdateOrder();
  const { data: customersData } = useCustomers({ limit: 200 });
  const customers = (customersData as any)?.data ?? [];

  const { register, handleSubmit, reset, watch, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      defaultValues: { items: [{ productName: '', productSku: '', quantity: '1', unitPrice: '', discount: '0', notes: '' }] },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems   = watch('items');
  const watchDiscount  = watch('discount');
  const watchShipping  = watch('shipping');

  const subtotal = watchedItems.reduce((sum, item) => {
    const qty   = parseFloat(item.quantity)  || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc  = parseFloat(item.discount)  || 0;
    return sum + qty * price * (1 - disc / 100);
  }, 0);
  const orderDiscount = parseFloat(watchDiscount) || 0;
  const shipping      = parseFloat(watchShipping) || 0;
  const total         = subtotal - orderDiscount + shipping;

  useEffect(() => {
    if (open) {
      reset({
        customerId:      order?.customerId      ?? '',
        paymentMethod:   order?.paymentMethod   ?? '',
        orderDate:       order?.orderDate       ? order.orderDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        deliveryDate:    order?.deliveryDate    ?? '',
        discount:        order?.discount        != null ? String(order.discount)  : '0',
        shipping:        order?.shipping        != null ? String(order.shipping)  : '0',
        shippingAddress: order?.shippingAddress ?? '',
        referenceNumber: order?.referenceNumber ?? '',
        notes:           order?.notes           ?? '',
        items: order?.items?.length
          ? order.items.map((i) => ({
              productName: i.productName,
              productSku:  i.productSku  ?? '',
              quantity:    String(i.quantity),
              unitPrice:   String(i.unitPrice),
              discount:    String(i.discount),
              notes:       i.notes ?? '',
            }))
          : [{ productName: '', productSku: '', quantity: '1', unitPrice: '', discount: '0', notes: '' }],
      });
    }
  }, [open, order, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      customerId:      values.customerId      || undefined,
      // status NÃO é enviado na criação — o backend força DRAFT
      paymentMethod:   values.paymentMethod   as any || undefined,
      orderDate:       values.orderDate       || undefined,
      deliveryDate:    values.deliveryDate    || undefined,
      discount:        parseFloat(values.discount)  || 0,
      shipping:        parseFloat(values.shipping)  || 0,
      shippingAddress: values.shippingAddress || undefined,
      referenceNumber: values.referenceNumber || undefined,
      notes:           values.notes           || undefined,
      items: values.items.map((i) => ({
        productName: i.productName.trim(),
        productSku:  i.productSku.trim() || undefined,
        quantity:    parseFloat(i.quantity)  || 1,
        unitPrice:   parseFloat(i.unitPrice) || 0,
        discount:    parseFloat(i.discount)  || 0,
        notes:       i.notes || undefined,
      })),
    };

    if (isEdit) {
      await update.mutateAsync({ id: order!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Editar Pedido ${order?.orderNumber}` : 'Novo Pedido'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Cliente */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cliente</label>
          <select {...register('customerId')} className={fieldClass}>
            <option value="">— Sem cliente —</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Datas + Pagamento */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Data do Pedido</label>
            <Input {...register('orderDate')} type="date" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Previsão de Entrega</label>
            <Input {...register('deliveryDate')} type="date" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Forma de Pagamento</label>
            <select {...register('paymentMethod')} className={fieldClass}>
              <option value="">— Selecione —</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Itens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Itens do Pedido</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productName: '', productSku: '', quantity: '1', unitPrice: '', discount: '0', notes: '' })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Item
            </Button>
          </div>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-1">
              {['Produto', 'SKU', 'Qtd', 'Preço Unit.', 'Desc.%', ''].map((h, i) => (
                <p key={i} className={`text-[10px] font-semibold text-[var(--text-subtle)] uppercase ${i === 0 ? 'col-span-4' : i === 1 ? 'col-span-2' : i === 5 ? 'col-span-1' : 'col-span-2'}`}>{h}</p>
              ))}
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-[var(--surface-2)]">
                <div className="col-span-4">
                  <Input
                    {...register(`items.${index}.productName`, { required: true })}
                    placeholder="Nome do produto"
                    size="sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input {...register(`items.${index}.productSku`)} placeholder="SKU" size="sm" />
                </div>
                <div className="col-span-1">
                  <Input {...register(`items.${index}.quantity`)} type="number" min="0.001" step="0.001" placeholder="1" size="sm" />
                </div>
                <div className="col-span-2">
                  <Input {...register(`items.${index}.unitPrice`)} type="number" min="0" step="0.01" placeholder="0,00" size="sm" />
                </div>
                <div className="col-span-2">
                  <Input {...register(`items.${index}.discount`)} type="number" min="0" max="100" step="0.01" placeholder="0" size="sm" />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Endereço de Entrega</label>
              <Input {...register('shippingAddress')} placeholder="Endereço completo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nº de Referência</label>
              <Input {...register('referenceNumber')} placeholder="NF, OS, etc." />
            </div>
          </div>

          <div className="space-y-2 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text-muted)]">Desconto (R$)</span>
              <Input {...register('discount')} type="number" min="0" step="0.01" placeholder="0,00" className="w-28 text-right" size="sm" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text-muted)]">Frete (R$)</span>
              <Input {...register('shipping')} type="number" min="0" step="0.01" placeholder="0,00" className="w-28 text-right" size="sm" />
            </div>
            <div className="flex justify-between text-base font-bold border-t border-[var(--border)] pt-2 mt-2">
              <span>Total</span>
              <span className="text-primary-500">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Observações internas..."
            className={fieldClass + ' resize-none'}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Salvar Alterações' : 'Criar Pedido'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
