'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Power, Lock } from 'lucide-react';
import { useSystemUsers, useToggleUserStatus } from '@/hooks/use-hr';
import { usePermission, useRole } from '@/store/auth.store';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserModal } from '@/components/modules/hr/user-modal';
import { formatDate } from '@/lib/utils';
import type { SystemUser } from '@/lib/api/hr.api';

const roleConfig: Record<string, { label: string; variant: any }> = {
  super_admin:  { label: 'Super Admin',   variant: 'danger'   },
  tenant_admin: { label: 'Administrador', variant: 'primary'  },
  manager:      { label: 'Gerente',       variant: 'warning'  },
  employee:     { label: 'Colaborador',   variant: 'default'  },
  viewer:       { label: 'Visualizador',  variant: 'default'  },
};

export default function UsersPage() {
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('firstName');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser]   = useState<SystemUser | null>(null);

  const filter = useMemo(() => ({ page, limit, search, sortBy, sortOrder }), [page, limit, search, sortBy, sortOrder]);
  const { data, isLoading, isFetching } = useSystemUsers(filter);
  const users      = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;
  const toggleMutation = useToggleUserStatus();
  // Admin e gerente sempre podem gerenciar usuários; outros precisam de users:manage
  const isAdmin      = useRole('super_admin', 'tenant_admin', 'manager');
  const hasUsersPerm = usePermission('users:manage');
  const canManage    = isAdmin || hasUsersPerm;

  const handleSort   = useCallback((k: string, d: 'ASC' | 'DESC') => { setSortBy(k); setSortOrder(d); setPage(1); }, []);
  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);

  const columns: Column<SystemUser>[] = [
    {
      key: 'firstName', header: 'Usuário', sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text)] truncate">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role', header: 'Perfil', width: '140px',
      cell: (row) => <Badge variant={roleConfig[row.role]?.variant} size="sm">{roleConfig[row.role]?.label ?? row.role}</Badge>,
    },
    {
      key: 'status', header: 'Status', width: '100px',
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'default'} dot size="sm">
          {row.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'permissions', header: 'Permissões', width: '120px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {row.permissions.includes('*') ? 'Todas' : `${row.permissions.length} permissões`}
        </span>
      ),
    },
    {
      key: 'lastLoginAt', header: 'Último acesso', sortable: true, width: '140px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Nunca'}
        </span>
      ),
    },
    {
      key: 'actions' as any, header: 'Ações', align: 'right', width: '140px',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {canManage ? (
            <>
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => { e.stopPropagation(); setEditUser(row); setModalOpen(true); }}
                leftIcon={<Pencil className="h-3 w-3" />}
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(row.id); }}
                title={row.status === 'active' ? 'Desativar' : 'Ativar'}
                disabled={toggleMutation.isPending}
              >
                <Power className={`h-3.5 w-3.5 ${row.status === 'active' ? 'text-danger' : 'text-success'}`} />
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
          <h2 className="text-xl font-bold text-[var(--text)]">Usuários do Sistema</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} usuários
            {isFetching && !isLoading && <span className="ml-2 text-xs text-[var(--text-subtle)]">atualizando...</span>}
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditUser(null); setModalOpen(true); }} disabled={!canManage}>
          Novo Usuário
        </Button>
      </div>

      <DataTable
          columns={columns} data={users} loading={isLoading}
          pagination={pagination} onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          onSort={handleSort} sortKey={sortBy} sortDir={sortOrder}
          searchable searchPlaceholder="Buscar usuários..." onSearch={handleSearch} searchValue={search}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🔐</div>
              <p className="text-sm font-medium text-[var(--text)]">Nenhum usuário cadastrado</p>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="mt-4" onClick={() => setModalOpen(true)}>
                Novo Usuário
              </Button>
            </div>
          }
        />

      <UserModal open={modalOpen} onClose={() => { setModalOpen(false); setEditUser(null); }} user={editUser} />
    </motion.div>
  );
}
