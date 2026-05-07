'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Truck, CreditCard, XCircle, Pencil, Trash2 } from 'lucide-react';
import {
  usePurchaseOrders,
  useConfirmPurchaseOrder,
  useReceivePurchaseOrder,
  useMarkPurchasePaid,
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
} from '@/hooks/use-purchases';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { PurchaseOrderModal } from '@/components/modules/purchases/purchase-order-modal';
import { ReportButton } from '@/components/ui/report-button';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/api/purchases.api';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; variant: any }> = {
  draft:     { label: 'Rascunho',   variant: 'default' },
  confirmed: { label: 'Confirmado', variant: 'primary' },
  received:  { label: 'Recebido',   variant: 'success' },
  paid:      { label: 'Pago',       variant: 'success' },
  cancelled: { label: 'Cancelado',  variant: 'danger'  },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro', credit_card: 'Cartão', boleto: 'Boleto',
  transfer: 'Transferência', pix: 'PIX', other: 'Outro',
};

const fieldClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

// ─── Confirm Order Modal ──────────────────────────────────────────────────────

function ConfirmOrderModal({ open, onClose, order }: { open: boolean; onClose: () => void; order: PurchaseOrder | null }) {
  const [paymentMethod, setPaymentMethod] = useState('boleto');
  const [dueDate, setDueDate] = useState('');
  const confirm = useConfirmPurchaseOrder();

  const handle = async () => {
    if (!order) return;
    await confirm.mutateAsync({ id: order.id, paymentMethod: paymentMethod as any, dueDate: dueDate || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Confirmar Ordem de Compra" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          Confirmar a ordem <strong className="text-[var(--text)]">{order?.orderNumber}</strong> irá
          criar uma conta a pagar no módulo financeiro.
        </p>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Forma de Pagamento</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={fieldClass}>
            <option value="boleto">Boleto</option>
            <option value="pix">PIX</option>
            <option value="transfer">Transferência</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="cash">Dinheiro</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Data de Vencimento</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldClass} />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={onClose} disabled={confirm.isPending}>Cancelar</Button>
          <Button onClick={handle} loading={confirm.isPending}>Confirmar Ordem</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Receive Modal ────────────────────────────────────────────────────────────

function ReceiveModal({ open, onClose, order }: { open: boolean; onClose: () => void; order: PurchaseOrder | null }) {
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const receive = useReceivePurchaseOrder();

  const handle = async () => {
    if (!order) return;
    await receive.mutateAsync({ id: order.id, receivedDate, notes: notes || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar Recebimento" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          Registrar o recebimento da ordem <strong className="text-[var(--text)]">{order?.orderNumber}</strong>{' '}
          dará entrada automática no estoque para os itens vinculados a produtos.
        </p>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Data de Recebimento</label>
          <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observações sobre o recebimento..."
            className={fieldClass}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={onClose} disabled={receive.isPending}>Cancelar</Button>
          <Button onClick={handle} loading={receive.isPending} leftIcon={<Truck className="h-4 w-4" />}>
            Confirmar Recebimento
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editOrder,    setEditOrder]    = useState<PurchaseOrder | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<PurchaseOrder | null>(null);
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const [deleteOrder,  setDeleteOrder]  = useState<PurchaseOrder | null>(null);
  const [cancelOrder,  setCancelOrder]  = useState<PurchaseOrder | null>(null);

  const markPaid  = useMarkPurchasePaid();
  const deleteMut = useDeletePurchaseOrder();
  const cancelMut = useCancelPurchaseOrder();

  const filter = useMemo(() => ({
    page, limit: 20,
    search:    search || undefined,
    status:    statusFilter || undefined,
    sortBy:    'orderDate',
    sortOrder: 'DESC' as const,
  }), [page, search, statusFilter]);

  const { data, isLoading, isFetching } = usePurchaseOrders(filter);
  const orders     = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Nº Ordem',
      cell: (row) => (
        <span className="font-mono text-sm font-semibold text-primary-500">{row.orderNumber}</span>
      ),
    },
    {
      key: 'supplier',
      header: 'Fornecedor',
      cell: (row) => (
        <span className="text-sm text-[var(--text)]">{row.supplier?.name ?? '—'}</span>
      ),
    },
    {
      key: 'orderDate',
      header: 'Data',
      width: '110px',
      cell: (row) => (
        <span className="text-sm text-[var(--text-muted)]">{formatDate(row.orderDate)}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      width: '120px',
      align: 'right',
      cell: (row) => (
        <span className="text-sm font-semibold tabular-nums text-[var(--text)]">
          {formatCurrency(Number(row.total))}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Pagamento',
      width: '130px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {row.paymentMethod ? PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.draft;
        return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
      },
    },
    {
      key: 'actions' as any,
      header: '',
      align: 'right',
      width: '180px',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {/* Ações de fluxo */}
          {row.status === 'draft' && (
            <Button size="xs" onClick={(e) => { e.stopPropagation(); setConfirmOrder(row); }}>
              <CheckCircle2 className="h-3 w-3 mr-1" />Confirmar
            </Button>
          )}
          {row.status === 'confirmed' && (
            <Button size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); setReceiveOrder(row); }}>
              <Truck className="h-3 w-3 mr-1" />Receber
            </Button>
          )}
          {row.status === 'received' && (
            <Button size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); markPaid.mutate(row.id); }}>
              <CreditCard className="h-3 w-3 mr-1" />Pagar
            </Button>
          )}

          {/* Editar — disponível para draft */}
          {row.status === 'draft' && (
            <Button
              variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setEditOrder(row); setOrderModalOpen(true); }}
              title="Editar ordem"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Cancelar — disponível para confirmed e received */}
          {['confirmed', 'received'].includes(row.status) && (
            <Button
              variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setCancelOrder(row); }}
              title="Cancelar ordem"
            >
              <XCircle className="h-3.5 w-3.5 text-danger" />
            </Button>
          )}

          {/* Excluir — somente draft */}
          {row.status === 'draft' && (
            <Button
              variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setDeleteOrder(row); }}
              title="Excluir rascunho"
            >
              <Trash2 className="h-3.5 w-3.5 text-danger" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Ordens de Compra</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} registros
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-[var(--text-subtle)]">atualizando...</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportButton module="general" size="sm" />
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => { setEditOrder(null); setOrderModalOpen(true); }}
          >
            Nova Ordem
          </Button>
        </div>
      </div>

      {/* Filtro de status */}
      <div className="flex flex-wrap gap-2">
        {([['', 'Todos'], ['draft', 'Rascunho'], ['confirmed', 'Confirmado'], ['received', 'Recebido'], ['paid', 'Pago'], ['cancelled', 'Cancelado']] as [string, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setStatusFilter(val as any); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              statusFilter === val
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:border-primary-500/40 hover:text-[var(--text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="[&_tr]:group">
        <DataTable
          columns={columns}
          data={orders}
          loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={() => setPage(1)}
          searchable
          searchPlaceholder="Buscar por número ou fornecedor..."
          onSearch={handleSearch}
          searchValue={search}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-sm font-medium text-[var(--text)]">Nenhuma ordem de compra encontrada</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                Clique no botão acima para criar uma nova ordem
              </p>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOrderModalOpen(true)}>
                Nova Ordem
              </Button>
            </div>
          }
        />
      </div>

      {/* Modals */}
      <PurchaseOrderModal
        open={orderModalOpen}
        onClose={() => { setOrderModalOpen(false); setEditOrder(null); }}
        order={editOrder}
      />

      <ConfirmOrderModal
        open={!!confirmOrder}
        onClose={() => setConfirmOrder(null)}
        order={confirmOrder}
      />

      <ReceiveModal
        open={!!receiveOrder}
        onClose={() => setReceiveOrder(null)}
        order={receiveOrder}
      />

      <ConfirmModal
        open={!!deleteOrder}
        onClose={() => setDeleteOrder(null)}
        onConfirm={async () => { await deleteMut.mutateAsync(deleteOrder!.id); setDeleteOrder(null); }}
        title="Excluir ordem de compra"
        description={`Excluir o rascunho "${deleteOrder?.orderNumber}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMut.isPending}
      />

      <ConfirmModal
        open={!!cancelOrder}
        onClose={() => setCancelOrder(null)}
        onConfirm={async () => { await cancelMut.mutateAsync(cancelOrder!.id); setCancelOrder(null); }}
        title="Cancelar ordem de compra"
        description={`Cancelar a ordem "${cancelOrder?.orderNumber}"? Esta ação reverterá o financeiro vinculado.`}
        confirmLabel="Cancelar Ordem"
        loading={cancelMut.isPending}
      />
    </motion.div>
  );
}
