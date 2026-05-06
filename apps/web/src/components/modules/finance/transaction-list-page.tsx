'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import {
  useTransactions,
  usePayTransaction,
  useDeleteTransaction,
} from '@/hooks/use-finance';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/modal';
import { TransactionModal } from '@/components/modules/finance/transaction-modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction, TransactionType } from '@/lib/api/finance.api';
import dayjs from 'dayjs';

const statusConfig: Record<string, { label: string; variant: any }> = {
  paid:      { label: 'Pago',      variant: 'success'  },
  pending:   { label: 'Pendente',  variant: 'warning'  },
  overdue:   { label: 'Vencido',   variant: 'danger'   },
  cancelled: { label: 'Cancelado', variant: 'default'  },
  scheduled: { label: 'Agendado',  variant: 'primary'  },
};

interface TransactionListPageProps {
  type: TransactionType;
  title: string;
  emptyMessage: string;
}

export function TransactionListPage({
  type,
  title,
  emptyMessage,
}: TransactionListPageProps) {
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('dueDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx]       = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx]   = useState<Transaction | null>(null);
  const [payTx, setPayTx]         = useState<Transaction | null>(null);

  // CORREÇÃO: useMemo garante que o objeto filter só muda quando os valores
  // mudam de verdade. Isso faz a queryKey ser estável entre renders, e a
  // invalidação do cache bate corretamente após criar/editar/excluir.
  const filter = useMemo(
    () => ({ type, page, limit, search, sortBy, sortOrder }),
    [type, page, limit, search, sortBy, sortOrder],
  );

  const { data, isLoading, isFetching } = useTransactions(filter);

  // A API retorna: { success, data: { data: Transaction[], meta: {...} } }
  // O client.ts extrai data.data, então chegamos com { data: [], meta: {} }
  const transactions = (data as any)?.data ?? [];
  const pagination   = (data as any)?.meta;

  const payMutation    = usePayTransaction();
  const deleteMutation = useDeleteTransaction();

  const handleSort = useCallback((key: string, dir: 'ASC' | 'DESC') => {
    setSortBy(key);
    setSortOrder(dir);
    setPage(1);
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const handlePay = async (tx: Transaction) => {
    await payMutation.mutateAsync({
      id: tx.id,
      paymentDate: dayjs().format('YYYY-MM-DD'),
    });
    setPayTx(null);
  };

  const handleDelete = async () => {
    if (!deleteTx) return;
    await deleteMutation.mutateAsync(deleteTx.id);
    setDeleteTx(null);
  };

  const openCreate = () => {
    setEditTx(null);
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTx(null);
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'dueDate',
      header: 'Vencimento',
      sortable: true,
      width: '120px',
      cell: (row) => {
        const isOverdue =
          row.status === 'overdue' ||
          (row.status === 'pending' &&
            dayjs(row.dueDate).isBefore(dayjs(), 'day'));
        return (
          <span
            className={`text-xs font-medium ${
              isOverdue ? 'text-danger' : 'text-[var(--text-muted)]'
            }`}
          >
            {formatDate(row.dueDate)}
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Descrição',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--text)] truncate">
            {row.description}
          </p>
          {row.counterpartName && (
            <p className="text-xs text-[var(--text-muted)] truncate">
              {row.counterpartName}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      width: '140px',
      cell: (row) =>
        row.category ? (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: row.category.color }}
            />
            <span className="truncate">{row.category.name}</span>
          </span>
        ) : (
          <span className="text-[var(--text-subtle)] text-xs">—</span>
        ),
    },
    {
      key: 'account',
      header: 'Conta',
      width: '130px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)] truncate">
          {row.account?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      cell: (row) => (
        <Badge variant={statusConfig[row.status]?.variant} dot size="sm">
          {statusConfig[row.status]?.label}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      align: 'right',
      sortable: true,
      width: '130px',
      cell: (row) => (
        <div className="text-right">
          <p
            className={`font-semibold tabular-nums text-sm ${
              type === 'income' ? 'text-success' : 'text-danger'
            }`}
          >
            {formatCurrency(row.amount)}
          </p>
          {row.paidAmount && row.paidAmount !== row.amount && (
            <p className="text-xs text-[var(--text-muted)]">
              Pago: {formatCurrency(row.paidAmount)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'actions' as any,
      header: 'Ações',
      align: 'right',
      width: '140px',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status !== 'paid' && row.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                setPayTx(row);
              }}
              leftIcon={<CheckCircle2 className="h-3 w-3 text-success" />}
            >
              {type === 'income' ? 'Recebido' : 'Pago'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => { e.stopPropagation(); setDeleteTx(row); }}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} registros
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-[var(--text-subtle)]">
                atualizando...
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
        >
          {type === 'income' ? 'Nova Receita' : 'Nova Despesa'}
        </Button>
      </div>

      {/* Table */}
      <DataTable
          columns={columns}
          data={transactions}
          loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          onSort={handleSort}
          sortKey={sortBy}
          sortDir={sortOrder}
          searchable
          searchPlaceholder={`Buscar ${
            type === 'income' ? 'receitas' : 'despesas'
          }...`}
          onSearch={handleSearch}
          searchValue={search}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">
                {type === 'income' ? '💰' : '📋'}
              </div>
              <p className="text-sm font-medium text-[var(--text)]">
                {emptyMessage}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Clique no botão acima para adicionar
              </p>
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={openCreate}
              >
                {type === 'income' ? 'Nova Receita' : 'Nova Despesa'}
              </Button>
            </div>
          }
        />

      {/* Modals */}
      <TransactionModal
        open={modalOpen}
        onClose={closeModal}
        transaction={editTx}
        defaultType={type}
      />

      <ConfirmModal
        open={!!payTx}
        onClose={() => setPayTx(null)}
        onConfirm={() => payTx && handlePay(payTx)}
        title={
          type === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento'
        }
        description={
          payTx
            ? `Deseja marcar "${payTx.description}" (${formatCurrency(
                payTx.amount,
              )}) como ${type === 'income' ? 'recebida' : 'paga'} hoje?`
            : ''
        }
        confirmLabel={
          type === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento'
        }
        variant="primary"
        loading={payMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteTx}
        onClose={() => setDeleteTx(null)}
        onConfirm={handleDelete}
        title="Excluir transação"
        description={`Deseja excluir "${deleteTx?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </motion.div>
  );
}
