'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuditLogs, useAuditModules } from '@/hooks/use-audit';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import type { AuditLog } from '@/lib/api/audit.api';

const fc = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const methodConfig: Record<string, { variant: any }> = {
  POST:   { variant: 'success' },
  PUT:    { variant: 'primary' },
  PATCH:  { variant: 'warning' },
  DELETE: { variant: 'danger'  },
  GET:    { variant: 'default' },
};

const moduleLabel: Record<string, string> = {
  auth: 'Auth', finance: 'Financeiro', inventory: 'Estoque',
  sales: 'Vendas', hr: 'RH', reports: 'Relatórios',
  settings: 'Configurações', dashboard: 'Dashboard',
  notifications: 'Notificações',
};

const actionLabel: Record<string, string> = {
  create: 'Criar', update: 'Atualizar', delete: 'Excluir',
  read: 'Ler', login: 'Login', logout: 'Logout',
  register: 'Registrar', pay: 'Pagar', confirm: 'Confirmar',
  invoice: 'Faturar', cancel: 'Cancelar', mark_paid: 'Marcar Pago',
  toggle_status: 'Alternar Status', update_permissions: 'Permissões',
  checkout: 'Checkout',
};

export default function AuditPage() {
  const [page, setPage]       = useState(1);
  const [limit, setLimit]     = useState(50);
  const [module, setModule]   = useState('');
  const [action, setAction]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [success, setSuccess] = useState('');

  const filter = useMemo(() => ({
    page, limit,
    module:   module   || undefined,
    action:   action   || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
    success:  success === '' ? undefined : success === 'true',
  }), [page, limit, module, action, dateFrom, dateTo, success]);

  const { data, isLoading, isFetching } = useAuditLogs(filter);
  const { data: modules = [] }          = useAuditModules();

  const logs       = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt', header: 'Data/Hora', width: '150px',
      cell: (row) => (
        <span className="text-xs tabular-nums text-[var(--text-muted)]">
          {formatDate(row.createdAt, 'datetime')}
        </span>
      ),
    },
    {
      key: 'userName', header: 'Usuário',
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text)] truncate">
            {row.userName ?? '—'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] truncate">
            {row.userEmail ?? ''}
          </p>
        </div>
      ),
    },
    {
      key: 'module', header: 'Módulo', width: '110px',
      cell: (row) => (
        <Badge variant="default" size="sm">
          {moduleLabel[row.module ?? ''] ?? row.module ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'action', header: 'Ação', width: '120px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {actionLabel[row.action ?? ''] ?? row.action ?? '—'}
        </span>
      ),
    },
    {
      key: 'method', header: 'Método', width: '80px',
      cell: (row) => (
        <Badge variant={methodConfig[row.method]?.variant ?? 'default'} size="sm">
          {row.method}
        </Badge>
      ),
    },
    {
      key: 'statusCode', header: 'Status', width: '80px', align: 'center',
      cell: (row) => (
        <span className={`text-xs font-mono font-semibold ${
          (row.statusCode ?? 200) < 400 ? 'text-success' : 'text-danger'
        }`}>
          {row.statusCode ?? '—'}
        </span>
      ),
    },
    {
      key: 'success', header: 'Resultado', width: '100px', align: 'center',
      cell: (row) => row.success ? (
        <span className="flex items-center justify-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> OK
        </span>
      ) : (
        <span className="flex items-center justify-center gap-1 text-xs text-danger" title={row.errorMessage ?? ''}>
          <XCircle className="h-3.5 w-3.5" /> Erro
        </span>
      ),
    },
    {
      key: 'durationMs', header: 'Duração', width: '90px', align: 'right',
      cell: (row) => (
        <span className="text-xs tabular-nums text-[var(--text-muted)]">
          {row.durationMs != null ? `${row.durationMs}ms` : '—'}
        </span>
      ),
    },
    {
      key: 'ipAddress', header: 'IP', width: '120px',
      cell: (row) => (
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {row.ipAddress ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary-500/10">
          <Shield className="h-5 w-5 text-primary-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Log de Auditoria</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Histórico de todas as ações realizadas no sistema
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-[var(--text-subtle)]">atualizando...</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Módulo</label>
          <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className={fc}>
            <option value="">Todos</option>
            {modules.map((m) => (
              <option key={m} value={m}>{moduleLabel[m] ?? m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Ação</label>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={fc}>
            <option value="">Todas</option>
            {Object.entries(actionLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Resultado</label>
          <select value={success} onChange={(e) => { setSuccess(e.target.value); setPage(1); }} className={fc}>
            <option value="">Todos</option>
            <option value="true">Sucesso</option>
            <option value="false">Erro</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} size="sm" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} size="sm" />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setModule(''); setAction(''); setSuccess(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors py-2 px-3 rounded-lg border border-[var(--border)] hover:border-[var(--border-strong)]"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        rowKey="id"
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-8 w-8 text-[var(--text-subtle)] mb-3" />
            <p className="text-sm font-medium text-[var(--text)]">Nenhum log encontrado</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Os logs aparecem aqui conforme ações são realizadas no sistema
            </p>
          </div>
        }
      />
    </motion.div>
  );
}
