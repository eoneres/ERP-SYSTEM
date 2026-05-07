'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Building2, User } from 'lucide-react';
import { useSuppliers, useDeleteSupplier } from '@/hooks/use-purchases';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/modal';
import { SupplierModal } from '@/components/modules/purchases/supplier-modal';
import type { Supplier } from '@/lib/api/purchases.api';

export default function SuppliersPage() {
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  const deleteMut = useDeleteSupplier();

  const filter = useMemo(
    () => ({ page, limit: 20, search: search || undefined, sortBy: 'name', sortOrder: 'ASC' as const }),
    [page, search],
  );

  const { data, isLoading, isFetching } = useSuppliers(filter);
  const suppliers  = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const handleSearch  = useCallback((q: string) => { setSearch(q); setPage(1); }, []);
  const handleDelete  = async () => {
    if (!deleteSupplier) return;
    await deleteMut.mutateAsync(deleteSupplier.id);
    setDeleteSupplier(null);
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Fornecedor',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[var(--surface-2)] shrink-0">
            {row.type === 'company'
              ? <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              : <User      className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)] truncate">{row.name}</p>
            {row.document && <p className="text-xs text-[var(--text-muted)]">{row.document}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Contato',
      cell: (row) => (
        <div className="text-xs text-[var(--text-muted)] space-y-0.5">
          {row.email && <p className="truncate">{row.email}</p>}
          {row.phone && <p>{row.phone}</p>}
          {!row.email && !row.phone && <span>—</span>}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Cidade / UF',
      width: '140px',
      cell: (row) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.city && row.state ? `${row.city} / ${row.state}` : row.city ?? row.state ?? '—'}
        </span>
      ),
    },
    {
      key: 'paymentTerms',
      header: 'Cond. Pagamento',
      width: '160px',
      cell: (row) => (
        <span className="text-sm text-[var(--text-muted)]">{row.paymentTerms ?? '—'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '90px',
      cell: (row) => (
        <Badge variant={row.isActive ? 'success' : 'default'} dot size="sm">
          {row.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions' as any,
      header: '',
      align: 'right',
      width: '80px',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost" size="icon-sm"
            onClick={(e) => { e.stopPropagation(); setEditSupplier(row); setModalOpen(true); }}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon-sm"
            onClick={(e) => { e.stopPropagation(); setDeleteSupplier(row); }}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Fornecedores</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} registros
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-[var(--text-subtle)]">atualizando...</span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => { setEditSupplier(null); setModalOpen(true); }}
        >
          Novo Fornecedor
        </Button>
      </div>

      <div className="[&_tr]:group">
        <DataTable
          columns={columns}
          data={suppliers}
          loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={(l) => { setPage(1); }}
          searchable
          searchPlaceholder="Buscar fornecedores..."
          onSearch={handleSearch}
          searchValue={search}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🏭</div>
              <p className="text-sm font-medium text-[var(--text)]">Nenhum fornecedor cadastrado</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Clique no botão acima para adicionar
              </p>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
                Novo Fornecedor
              </Button>
            </div>
          }
        />
      </div>

      <SupplierModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditSupplier(null); }}
        supplier={editSupplier}
      />

      <ConfirmModal
        open={!!deleteSupplier}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={handleDelete}
        title="Excluir fornecedor"
        description={`Deseja excluir "${deleteSupplier?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMut.isPending}
      />
    </motion.div>
  );
}
