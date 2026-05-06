'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Building2, User } from 'lucide-react';
import { useCustomers, useDeleteCustomer } from '@/hooks/use-sales';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/modal';
import { CustomerModal } from '@/components/modules/sales/customer-modal';
import type { Customer } from '@/lib/api/sales.api';

export default function CustomersPage() {
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer]   = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  const filter = useMemo(
    () => ({ page, limit, search, sortBy, sortOrder }),
    [page, limit, search, sortBy, sortOrder],
  );

  const { data, isLoading, isFetching } = useCustomers(filter);
  const customers  = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const deleteMutation = useDeleteCustomer();

  const handleSort   = useCallback((key: string, dir: 'ASC' | 'DESC') => { setSortBy(key); setSortOrder(dir); setPage(1); }, []);
  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    await deleteMutation.mutateAsync(deleteCustomer.id);
    setDeleteCustomer(null);
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[var(--surface-2)] shrink-0">
            {row.type === 'company'
              ? <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              : <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)] truncate">{row.name}</p>
            {row.document && <p className="text-xs text-[var(--text-muted)]">{row.document}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '130px',
      cell: (row) => (
        <Badge variant={row.type === 'company' ? 'primary' : 'default'} size="sm">
          {row.type === 'company' ? 'Pessoa Jurídica' : 'Pessoa Física'}
        </Badge>
      ),
    },
    {
      key: 'email',
      header: 'E-mail',
      cell: (row) => (
        <span className="text-sm text-[var(--text-muted)] truncate">{row.email ?? '—'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      width: '140px',
      cell: (row) => (
        <span className="text-sm text-[var(--text-muted)]">{row.phone ?? '—'}</span>
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
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); setEditCustomer(row); setModalOpen(true); }}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); setDeleteCustomer(row); }}
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
          <h2 className="text-xl font-bold text-[var(--text)]">Clientes</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} registros
            {isFetching && !isLoading && <span className="ml-2 text-xs text-[var(--text-subtle)]">atualizando...</span>}
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditCustomer(null); setModalOpen(true); }}>
          Novo Cliente
        </Button>
      </div>

      <div className="[&_tr]:group">
        <DataTable
          columns={columns}
          data={customers}
          loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          onSort={handleSort}
          sortKey={sortBy}
          sortDir={sortOrder}
          searchable
          searchPlaceholder="Buscar clientes..."
          onSearch={handleSearch}
          searchValue={search}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm font-medium text-[var(--text)]">Nenhum cliente cadastrado</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Clique no botão acima para adicionar</p>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
                Novo Cliente
              </Button>
            </div>
          }
        />
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCustomer(null); }}
        customer={editCustomer}
      />

      <ConfirmModal
        open={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={handleDelete}
        title="Excluir cliente"
        description={`Deseja excluir "${deleteCustomer?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </motion.div>
  );
}
