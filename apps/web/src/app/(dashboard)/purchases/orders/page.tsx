'use client';

import { useState } from 'react';
import {
  Plus, CheckCircle2, Truck, CreditCard, XCircle,
  Clock, ChevronDown, Trash2, Edit2,
} from 'lucide-react';
import {
  usePurchaseOrders,
  useConfirmPurchaseOrder,
  useReceivePurchaseOrder,
  useMarkPurchasePaid,
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
} from '@/hooks/use-purchases';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PurchaseOrderModal } from '@/components/modules/purchases/purchase-order-modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/api/purchases.api';
import { ReportButton } from '@/components/ui/report-button';

const statusConfig: Record<PurchaseOrderStatus, { label: string; variant: any }> = {
  draft:     { label: 'Rascunho',   variant: 'default'  },
  confirmed: { label: 'Confirmado', variant: 'primary'  },
  received:  { label: 'Recebido',   variant: 'success'  },
  paid:      { label: 'Pago',       variant: 'success'  },
  cancelled: { label: 'Cancelado',  variant: 'danger'   },
};

const paymentMethodLabel: Record<string, string> = {
  cash:        'Dinheiro',
  credit_card: 'Cartão de Crédito',
  boleto:      'Boleto',
  transfer:    'Transferência',
  pix:         'PIX',
  other:       'Outro',
};

// ─── Confirm modal (pede forma de pgto e vencimento) ──────────────────────────
function ConfirmModal({
  open, onClose, order,
}: { open: boolean; onClose: () => void; order: PurchaseOrder | null }) {
  const [paymentMethod, setPaymentMethod] = useState('boleto');
  const [dueDate, setDueDate] = useState('');
  const confirm = useConfirmPurchaseOrder();

  const fieldClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

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
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Forma de Pagamento</label>
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
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Data de Vencimento</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldClass} />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="outline" onClick={onClose} disabled={confirm.isPending}>Cancelar</Button>
          <Button variant="primary" onClick={handle} loading={confirm.isPending}>
            Confirmar Ordem
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Receive modal ────────────────────────────────────────────────────────────
function ReceiveModal({
  open, onClose, order,
}: { open: boolean; onClose: () => void; order: PurchaseOrder | null }) {
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const receive = useReceivePurchaseOrder();

  const fieldClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

  const handle = async () => {
    if (!order) return;
    await receive.mutateAsync({ id: order.id, receivedDate, notes: notes || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar Recebimento" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          Registrar o recebimento da ordem <strong className="text-[var(--text)]">{order?.orderNumber}</strong>
          {' '}dará entrada automática no estoque para os itens vinculados a produtos.
        </p>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Data de Recebimento</label>
          <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observações sobre o recebimento..."
            className={fieldClass}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="outline" onClick={onClose} disabled={receive.isPending}>Cancelar</Button>
          <Button variant="success" onClick={handle} loading={receive.isPending}>
            <Truck className="h-4 w-4 mr-1" />
            Confirmar Recebimento
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editOrder, setEditOrder]           = useState<PurchaseOrder | null>(null);
  const [confirmOrder, setConfirmOrder]     = useState<PurchaseOrder | null>(null);
  const [receiveOrder, setReceiveOrder]     = useState<PurchaseOrder | null>(null);

  const markPaid   = useMarkPurchasePaid();
  const cancelMut  = useCancelPurchaseOrder();
  const deleteMut  = useDeletePurchaseOrder();

  const { data, isLoading } = usePurchaseOrders({
    page,
    limit: 15,
    search: search || undefined,
    status: statusFilter || undefined,
    sortBy: 'orderDate',
    sortOrder: 'DESC',
  });

  const orders = data?.data ?? [];
  const meta   = data?.meta;

  const columns = [
    {
      key: 'orderNumber',
      label: 'Nº Ordem',
      render: (v: string) => (
        <span className="font-mono text-sm font-medium text-primary-500">{v}</span>
      ),
    },
    {
      key: 'supplier',
      label: 'Fornecedor',
      render: (_: any, row: PurchaseOrder) => (
        <span className="text-sm text-[var(--text)]">{row.supplier?.name ?? '—'}</span>
      ),
    },
    {
      key: 'orderDate',
      label: 'Data',
      render: (v: string) => <span className="text-sm">{formatDate(v)}</span>,
    },
    {
      key: 'total',
      label: 'Total',
      render: (v: number) => (
        <span className="font-semibold text-sm">{formatCurrency(v)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Pagamento',
      render: (v: string) => (
        <span className="text-xs text-[var(--text-muted)]">{paymentMethodLabel[v] ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: PurchaseOrderStatus) => {
        const cfg = statusConfig[v] ?? statusConfig.draft;
        return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: '',
      render: (_: any, row: PurchaseOrder) => (
        <div className="flex items-center gap-1 justify-end">
          {row.status === 'draft' && (
            <>
              <Button
                variant="primary"
                size="xs"
                onClick={() => setConfirmOrder(row)}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Confirmar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => { setEditOrder(row); setOrderModalOpen(true); }}
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
            </>
          )}
          {row.status === 'confirmed' && (
            <Button
              variant="success"
              size="xs"
              onClick={() => setReceiveOrder(row)}
            >
              <Truck className="h-3 w-3 mr-1" />
              Receber
            </Button>
          )}
          {row.status === 'received' && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => markPaid.mutate(row.id)}
            >
              <CreditCard className="h-3 w-3 mr-1" />
              Marcar Pago
            </Button>
          )}
          {!['draft', 'paid', 'cancelled'].includes(row.status) && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => cancelMut.mutate(row.id)}
              title="Cancelar"
            >
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Ordens de Compra</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Gerencie todo o ciclo de compras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportButton module="purchases" />
          <Button variant="primary" onClick={() => { setEditOrder(null); setOrderModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por número ou fornecedor..."
            className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors"
          >
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="confirmed">Confirmado</option>
            <option value="received">Recebido</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </Card>

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={orders}
        loading={isLoading}
        pagination={meta ? {
          page: meta.page,
          totalPages: meta.totalPages,
          total: meta.total,
          onPageChange: setPage,
        } : undefined}
        emptyMessage="Nenhuma ordem de compra encontrada"
      />

      {/* Modals */}
      <PurchaseOrderModal
        open={orderModalOpen}
        onClose={() => { setOrderModalOpen(false); setEditOrder(null); }}
        order={editOrder}
      />
      <ConfirmModal
        open={!!confirmOrder}
        onClose={() => setConfirmOrder(null)}
        order={confirmOrder}
      />
      <ReceiveModal
        open={!!receiveOrder}
        onClose={() => setReceiveOrder(null)}
        order={receiveOrder}
      />
    </div>
  );
}
