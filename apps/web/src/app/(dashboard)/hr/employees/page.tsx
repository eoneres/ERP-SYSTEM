'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { useEmployees, useDeleteEmployee } from '@/hooks/use-hr';
import { usePermission, useRole } from '@/store/auth.store';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/modal';
import { EmployeeModal } from '@/components/modules/hr/employee-modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Employee } from '@/lib/api/hr.api';

const statusConfig: Record<string, { label: string; variant: any }> = {
  active:     { label: 'Ativo',      variant: 'success' },
  inactive:   { label: 'Inativo',    variant: 'default' },
  on_leave:   { label: 'Afastado',   variant: 'warning' },
  terminated: { label: 'Desligado',  variant: 'danger'  },
};

const typeLabel: Record<string, string> = {
  clt: 'CLT', pj: 'PJ', intern: 'Estágio', freelancer: 'Freelancer', temporary: 'Temporário',
};

export default function EmployeesPage() {
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('fullName');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editEmp, setEditEmp]         = useState<Employee | null>(null);
  const [deleteEmp, setDeleteEmp]     = useState<Employee | null>(null);

  const filter = useMemo(() => ({ page, limit, search, sortBy, sortOrder }), [page, limit, search, sortBy, sortOrder]);
  const { data, isLoading, isFetching } = useEmployees(filter);
  const employees  = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;
  const deleteMutation = useDeleteEmployee();
  // Admin e gerente sempre podem editar; outros precisam de hr:manage
  const isAdmin   = useRole('super_admin', 'tenant_admin', 'manager');
  const hasHRPerm = usePermission('hr:manage');
  const canEdit   = isAdmin || hasHRPerm;

  const handleSort   = useCallback((k: string, d: 'ASC' | 'DESC') => { setSortBy(k); setSortOrder(d); setPage(1); }, []);
  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);

  const columns: Column<Employee>[] = [
    {
      key: 'fullName', header: 'Colaborador', sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text)] truncate">{row.fullName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.position}</p>
        </div>
      ),
    },
    {
      key: 'department', header: 'Departamento', width: '140px',
      cell: (row) => <span className="text-sm text-[var(--text-muted)]">{row.department ?? '—'}</span>,
    },
    {
      key: 'employmentType', header: 'Vínculo', width: '100px',
      cell: (row) => <Badge variant="default" size="sm">{typeLabel[row.employmentType] ?? row.employmentType}</Badge>,
    },
    {
      key: 'hireDate', header: 'Admissão', sortable: true, width: '110px',
      cell: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDate(row.hireDate)}</span>,
    },
    {
      key: 'salary', header: 'Salário', align: 'right', sortable: true, width: '120px',
      cell: (row) => <span className="text-sm tabular-nums font-medium">{formatCurrency(row.salary)}</span>,
    },
    {
      key: 'status', header: 'Status', width: '100px',
      cell: (row) => <Badge variant={statusConfig[row.status]?.variant} dot size="sm">{statusConfig[row.status]?.label}</Badge>,
    },
    {
      key: 'actions' as any, header: 'Ações', align: 'right', width: '120px',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit ? (
            <>
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => { e.stopPropagation(); setEditEmp(row); setModalOpen(true); }}
                leftIcon={<Pencil className="h-3 w-3" />}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => { e.stopPropagation(); setDeleteEmp(row); }}
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </Button>
            </>
          ) : (
            <span className="text-xs text-[var(--text-subtle)] flex items-center gap-1">
              <Lock className="h-3 w-3" /> Sem permissão
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Colaboradores</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} registros
            {isFetching && !isLoading && <span className="ml-2 text-xs text-[var(--text-subtle)]">atualizando...</span>}
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditEmp(null); setModalOpen(true); }} disabled={!canEdit}>
          Novo Colaborador
        </Button>
      </div>

      <DataTable
          columns={columns} data={employees} loading={isLoading}
          pagination={pagination} onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          onSort={handleSort} sortKey={sortBy} sortDir={sortOrder}
          searchable searchPlaceholder="Buscar colaboradores..." onSearch={handleSearch} searchValue={search}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm font-medium text-[var(--text)]">Nenhum colaborador cadastrado</p>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="mt-4" onClick={() => setModalOpen(true)}>
                Novo Colaborador
              </Button>
            </div>
          }
        />

      <EmployeeModal open={modalOpen} onClose={() => { setModalOpen(false); setEditEmp(null); }} employee={editEmp} />

      <ConfirmModal
        open={!!deleteEmp} onClose={() => setDeleteEmp(null)}
        onConfirm={async () => { if (!deleteEmp) return; await deleteMutation.mutateAsync(deleteEmp.id); setDeleteEmp(null); }}
        title="Excluir colaborador"
        description={`Excluir "${deleteEmp?.fullName}"? O histórico será mantido (soft delete).`}
        confirmLabel="Excluir" loading={deleteMutation.isPending}
      />
    </motion.div>
  );
}
