'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Warehouse, Plus, Pencil, Trash2, MapPin, Star } from 'lucide-react';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/hooks/use-inventory';
import { Card }   from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge }  from '@/components/ui/badge';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { Input }  from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { Warehouse as WarehouseType } from '@/lib/api/inventory.api';

interface FormValues {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  isDefault: boolean;
  notes: string;
}

function WarehouseModal({
  open, onClose, warehouse,
}: { open: boolean; onClose: () => void; warehouse?: WarehouseType | null }) {
  const isEdit = !!warehouse;
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useState(() => {
    if (open) {
      reset({
        name:      warehouse?.name      ?? '',
        code:      warehouse?.code      ?? '',
        address:   warehouse?.address   ?? '',
        city:      warehouse?.city      ?? '',
        state:     warehouse?.state     ?? '',
        isDefault: warehouse?.isDefault ?? false,
        notes:     warehouse?.notes     ?? '',
      });
    }
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:      values.name.trim(),
      code:      values.code.trim()    || undefined,
      address:   values.address.trim() || undefined,
      city:      values.city.trim()    || undefined,
      state:     values.state.trim()   || undefined,
      isDefault: values.isDefault,
      notes:     values.notes.trim()   || undefined,
    };
    if (isEdit) {
      await update.mutateAsync({ id: warehouse!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  const fieldClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Depósito' : 'Novo Depósito'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Nome <span className="text-danger">*</span>
          </label>
          <Input
            {...register('name', { required: 'Nome é obrigatório' })}
            placeholder="Ex: Depósito Central"
            error={errors.name?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Código</label>
            <Input {...register('code')} placeholder="Ex: DEP-01" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Estado (UF)</label>
            <Input {...register('state')} placeholder="Ex: SP" maxLength={2} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Endereço</label>
          <Input {...register('address')} placeholder="Rua, número, bairro" />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cidade</label>
          <Input {...register('city')} placeholder="Ex: São Paulo" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('isDefault')} className="rounded" />
          <span className="text-sm text-[var(--text-muted)]">Definir como depósito padrão</span>
        </label>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
          <textarea
            {...register('notes')}
            rows={2}
            className={fieldClass + ' resize-none'}
            placeholder="Informações adicionais..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Salvar' : 'Criar Depósito'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function WarehousesPage() {
  const { data: warehouses = [], isLoading } = useWarehouses();
  const deleteWarehouse = useDeleteWarehouse();

  const [modalOpen,   setModalOpen]   = useState(false);
  const [editWh,      setEditWh]      = useState<WarehouseType | null>(null);
  const [deleteWh,    setDeleteWh]    = useState<WarehouseType | null>(null);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Depósitos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Gerencie seus locais de armazenamento
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditWh(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Depósito
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <Card className="text-center py-16">
          <Warehouse className="h-12 w-12 text-[var(--text-subtle)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--text)]">Nenhum depósito cadastrado</p>
          <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">
            Crie seu primeiro depósito para organizar seu estoque
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Criar Depósito
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <Card key={wh.id} className="group relative">
              {wh.isDefault && (
                <div className="absolute top-3 right-3">
                  <Badge variant="primary" size="sm">
                    <Star className="h-2.5 w-2.5 mr-1" />
                    Padrão
                  </Badge>
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                  <Warehouse className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">{wh.name}</h3>
                  {wh.code && <p className="text-xs text-[var(--text-subtle)]">{wh.code}</p>}
                </div>
              </div>

              {(wh.address || wh.city) && (
                <div className="flex items-start gap-1.5 mb-3">
                  <MapPin className="h-3.5 w-3.5 text-[var(--text-subtle)] mt-0.5 shrink-0" />
                  <p className="text-xs text-[var(--text-muted)]">
                    {[wh.address, wh.city, wh.state].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {wh.notes && (
                <p className="text-xs text-[var(--text-subtle)] mb-3 line-clamp-2">{wh.notes}</p>
              )}

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditWh(wh); setModalOpen(true); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
                <button
                  onClick={() => setDeleteWh(wh)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <WarehouseModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditWh(null); }}
        warehouse={editWh}
      />

      <ConfirmModal
        open={!!deleteWh}
        onClose={() => setDeleteWh(null)}
        onConfirm={async () => {
          await deleteWarehouse.mutateAsync(deleteWh!.id);
          setDeleteWh(null);
        }}
        title="Desativar depósito"
        description={`Deseja desativar o depósito "${deleteWh?.name}"?`}
        confirmLabel="Desativar"
        danger
      />
    </div>
  );
}
