'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, User } from 'lucide-react';
import { useSuppliers, useDeleteSupplier } from '@/hooks/use-purchases';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SupplierModal } from '@/components/modules/purchases/supplier-modal';
import type { Supplier } from '@/lib/api/purchases.api';

export default function SuppliersPage() {
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const deleteMut = useDeleteSupplier();

  const { data, isLoading } = useSuppliers({
    page, limit: 15,
    search: search || undefined,
    sortBy: 'name',
    sortOrder: 'ASC',
  });

  const suppliers = data?.data ?? [];
  const meta      = data?.meta;

  const columns = [
    {
      key: 'name',
      label: 'Fornecedor',
      render: (v: string, row: Supplier) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center shrink-0">
            {row.type === 'company'
              ? <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
              : <User className="h-4 w-4 text-[var(--text-muted)]" />
            }
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{v}</p>
            {row.document && <p className="text-xs text-[var(--text-muted)]">{row.document}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Contato',
      render: (_: any, row: Supplier) => (
        <div className="text-sm text-[var(--text-muted)]">
          {row.email && <p>{row.email}</p>}
          {row.phone && <p>{row.phone}</p>}
        </div>
      ),
    },
    {
      key: 'city',
      label: 'Cidade / UF',
      render: (_: any, row: Supplier) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.city && row.state ? `${row.city} / ${row.state}` : row.city ?? row.state ?? '—'}
        </span>
      ),
    },
    {
      key: 'paymentTerms',
      label: 'Cond. Pagamento',
      render: (v: string) => (
        <span className="text-sm text-[var(--text-muted)]">{v ?? '—'}</span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (v: boolean) => (
        <Badge variant={v ? 'success' : 'danger'} size="sm">
          {v ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_: any, row: Supplier) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { setEditSupplier(row); setModalOpen(true); }}
            title="Editar"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => deleteMut.mutate(row.id)}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Fornecedores</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Cadastro e gestão de fornecedores
          </p>
        </div>
        <Button variant="primary" onClick={() => { setEditSupplier(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nome, CNPJ ou e-mail..."
          className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
        />
      </Card>

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={suppliers}
        loading={isLoading}
        pagination={meta ? {
          page: meta.page,
          totalPages: meta.totalPages,
          total: meta.total,
          onPageChange: setPage,
        } : undefined}
        emptyMessage="Nenhum fornecedor cadastrado"
      />

      <SupplierModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditSupplier(null); }}
        supplier={editSupplier}
      />
    </div>
  );
}
