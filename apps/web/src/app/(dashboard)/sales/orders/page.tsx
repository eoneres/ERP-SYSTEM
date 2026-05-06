'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, ChevronDown,
  CheckCircle2, XCircle, FileText, ShoppingBag,
} from 'lucide-react';
import {
  useOrders, useDeleteOrder, useConfirmOrder,
  useInvoiceOrder, useMarkPaid, useCancelOrder,
} from '@/hooks/use-sales';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { OrderModal } from '@/components/modules/sales/order-modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order, OrderStatus, PaymentMethod } from '@/lib/api/sales.api';

// ─── Configs ──────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; variant: any }> = {
  draft:      { label: 'Rascunho',    variant: 'default'  },
  confirmed:  { label: 'Confirmado',  variant: 'primary'  },
  invoiced:   { label: 'Faturado',    variant: 'warning'  },
  processing: { label: 'Processando', variant: 'warning'  }, // legado
  shipped:    { label: 'Enviado',     variant: 'primary'  }, // legado
  delivered:  { label: 'Entregue',    variant: 'success'  },
  cancelled:  { label: 'Cancelado',   variant: 'danger'   },
  returned:   { label: 'Devolvido',   variant: 'danger'   },
};

const paymentStatusConfig: Record<string, { label: string; variant: any }> = {
  pending:  { label: 'Pendente',  variant: 'warning' },
  paid:     { label: 'Pago',      variant: 'success' },
  partial:  { label: 'Parcial',   variant: 'primary' },
  refunded: { label: 'Estornado', variant: 'danger'  },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash',        label: 'Dinheiro'          },
  { value: 'pix',         label: 'PIX'               },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card',  label: 'Cartão de Débito'  },
  { value: 'boleto',      label: 'Boleto'            },
  { value: 'transfer',    label: 'Transferência'     },
  { value: 'other',       label: 'Outro'             },
];

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

// ─── ActionButton — botão de ação principal por status ────────────────────────
// DRAFT     → "Confirmar" (reserva estoque)
// CONFIRMED → "Faturar"   (baixa estoque + cria conta a receber)
// INVOICED  → "Pago" / dropdown "Não pago"
// outros    → nada
function ActionButton({ order, onConfirm, onInvoice, onMarkPaid, onMarkUnpaid, loading }: {
  order: Order;
  onConfirm:    () => void;
  onInvoice:    () => void;
  onMarkPaid:   () => void;
  onMarkUnpaid: () => void;
  loading: boolean;
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (order.status === 'draft') {
    return (
      <button
        disabled={loading}
        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 transition-colors disabled:opacity-50"
      >
        <ShoppingBag className="h-3.5 w-3.5" />
        Confirmar
      </button>
    );
  }

  if (order.status === 'confirmed') {
    return (
      <button
        disabled={loading}
        onClick={(e) => { e.stopPropagation(); onInvoice(); }}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-purple-500/15 text-purple-600 hover:bg-purple-500/25 transition-colors disabled:opacity-50"
      >
        <FileText className="h-3.5 w-3.5" />
        Faturar
      </button>
    );
  }

  if (order.status === 'invoiced') {
    const isPaid = order.paymentStatus === 'paid' || order.paymentStatus === 'partial';

    if (isPaid) {
      return (
        <div ref={ref} className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
          <span className="flex items-center gap-1 px-2 py-1 rounded-l text-xs font-semibold bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {order.paymentStatus === 'paid' ? 'Pago' : 'Parcial'}
          </span>
          <button
            disabled={loading}
            onClick={() => setDropOpen((v) => !v)}
            className="flex items-center px-1 py-1 rounded-r border-l border-emerald-500/30 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
          <AnimatePresence>
            {dropOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => { onMarkUnpaid(); setDropOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Desfazer pagamento
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // Faturado mas não pago
    return (
      <div ref={ref} className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
        <button
          disabled={loading}
          onClick={onMarkPaid}
          className="flex items-center gap-1 px-2 py-1 rounded-l text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-emerald-500/15 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Pago
        </button>
        <button
          disabled={loading}
          onClick={() => setDropOpen((v) => !v)}
          className="flex items-center px-1 py-1 rounded-r border-l border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
        <AnimatePresence>
          {dropOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden"
            >
              <button
                onClick={() => { onMarkUnpaid(); setDropOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Não pago
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}

// ─── InvoiceModal — seleciona forma de pagamento ao faturar ───────────────────
function InvoiceModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void;
  onConfirm: (pm: PaymentMethod, dueDate: string) => void;
  loading: boolean;
}) {
  const [pm, setPm]       = useState<PaymentMethod>('pix');
  const [due, setDue]     = useState(new Date().toISOString().slice(0, 10));

  return (
    <Modal open={open} onClose={onClose} title="Faturar Pedido" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Forma de Pagamento</label>
          <select value={pm} onChange={(e) => setPm(e.target.value as PaymentMethod)} className={fieldClass}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Vencimento da Fatura</label>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <p className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] rounded-lg p-3">
          Ao faturar: o estoque será baixado e uma <strong>conta a receber</strong> será criada automaticamente no módulo Financeiro.
        </p>
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button size="sm" loading={loading} onClick={() => onConfirm(pm, due)}>Faturar Pedido</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [search, setSearch]       = useState('');
  const [sortBy, setSortBy]       = useState('orderDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [modalOpen, setModalOpen]         = useState(false);
  const [editOrder, setEditOrder]         = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder]     = useState<Order | null>(null);
  const [cancelOrder, setCancelOrder]     = useState<Order | null>(null);
  const [confirmOrder, setConfirmOrder]   = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder]   = useState<Order | null>(null);
  const [unpaidOrder, setUnpaidOrder]     = useState<Order | null>(null);

  const filter = useMemo(
    () => ({ page, limit, search, sortBy, sortOrder }),
    [page, limit, search, sortBy, sortOrder],
  );

  const { data, isLoading, isFetching } = useOrders(filter);
  const orders     = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const deleteMutation  = useDeleteOrder();
  const confirmMutation = useConfirmOrder();
  const invoiceMutation = useInvoiceOrder();
  const markPaidMutation = useMarkPaid();
  const cancelMutation  = useCancelOrder();

  const anyLoading = confirmMutation.isPending || invoiceMutation.isPending ||
    markPaidMutation.isPending || cancelMutation.isPending;

  const handleSort   = useCallback((k: string, d: 'ASC' | 'DESC') => { setSortBy(k); setSortOrder(d); setPage(1); }, []);
  const handleSearch = useCallback((q: string) => { setSearch(q); setPage(1); }, []);

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber', header: 'Pedido', sortable: true, width: '130px',
      cell: (row) => <span className="font-mono text-xs font-semibold text-[var(--text)]">{row.orderNumber}</span>,
    },
    {
      key: 'customer', header: 'Cliente',
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text)] truncate">
            {row.customer?.name ?? <span className="text-[var(--text-subtle)]">—</span>}
          </p>
          {row.customer?.email && <p className="text-xs text-[var(--text-muted)] truncate">{row.customer.email}</p>}
        </div>
      ),
    },
    {
      key: 'orderDate', header: 'Data', sortable: true, width: '110px',
      cell: (row) => <span className="text-xs text-[var(--text-muted)]">{formatDate(row.orderDate)}</span>,
    },
    {
      key: 'status', header: 'Status', width: '130px',
      cell: (row) => (
        <Badge variant={statusConfig[row.status]?.variant} dot size="sm">
          {statusConfig[row.status]?.label}
        </Badge>
      ),
    },
    {
      // Coluna de ação principal — muda conforme o status do pedido
      key: 'action' as any, header: 'Ação', width: '140px',
      cell: (row) => (
        <ActionButton
          order={row}
          loading={anyLoading}
          onConfirm={() => setConfirmOrder(row)}
          onInvoice={() => setInvoiceOrder(row)}
          onMarkPaid={() => markPaidMutation.mutate({ id: row.id })}
          onMarkUnpaid={() => setUnpaidOrder(row)}
        />
      ),
    },
    {
      key: 'total', header: 'Total', align: 'right', sortable: true, width: '120px',
      cell: (row) => <span className="font-semibold tabular-nums text-sm">{formatCurrency(row.total)}</span>,
    },
    {
      key: 'actions' as any, header: '', align: 'right', width: '80px',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {row.status === 'draft' && (
            <Button variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setEditOrder(row); setModalOpen(true); }}
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {['draft', 'confirmed', 'invoiced'].includes(row.status) && (
            <Button variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setCancelOrder(row); }}
              title="Cancelar pedido"
            >
              <XCircle className="h-3.5 w-3.5 text-danger" />
            </Button>
          )}
          {row.status === 'draft' && (
            <Button variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setDeleteOrder(row); }}
              title="Excluir rascunho"
            >
              <Trash2 className="h-3.5 w-3.5 text-[var(--text-subtle)]" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Pedidos</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} registros
            {isFetching && !isLoading && <span className="ml-2 text-xs text-[var(--text-subtle)]">atualizando...</span>}
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => { setEditOrder(null); setModalOpen(true); }}>
          Novo Pedido
        </Button>
      </div>

      {/* Legenda do fluxo */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap">
        <span className="font-medium">Fluxo:</span>
        {[
          { label: 'Rascunho', color: 'bg-[var(--surface-3)]' },
          { label: '→ Confirmar (reserva estoque)', color: 'bg-blue-500/20' },
          { label: '→ Faturar (baixa estoque + financeiro)', color: 'bg-purple-500/20' },
          { label: '→ Pago', color: 'bg-emerald-500/20' },
        ].map((s) => (
          <span key={s.label} className={`px-2 py-0.5 rounded ${s.color}`}>{s.label}</span>
        ))}
      </div>

      <div className="[&_tr]:group">
        <DataTable
          columns={columns} data={orders} loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          onSort={handleSort} sortKey={sortBy} sortDir={sortOrder}
          searchable searchPlaceholder="Buscar pedidos..."
          onSearch={handleSearch} searchValue={search}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-sm font-medium text-[var(--text)]">Nenhum pedido encontrado</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Clique no botão acima para criar</p>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
                Novo Pedido
              </Button>
            </div>
          }
        />
      </div>

      {/* Modals */}
      <OrderModal open={modalOpen} onClose={() => { setModalOpen(false); setEditOrder(null); }} order={editOrder} />

      {/* Confirmar pedido */}
      <ConfirmModal
        open={!!confirmOrder} onClose={() => setConfirmOrder(null)}
        onConfirm={() => {
          if (!confirmOrder) return;
          confirmMutation.mutate({ id: confirmOrder.id });
          setConfirmOrder(null);
        }}
        title="Confirmar pedido"
        description={`Confirmar "${confirmOrder?.orderNumber}"? O estoque dos produtos será reservado imediatamente.`}
        confirmLabel="Confirmar e reservar estoque"
        variant="primary"
        loading={confirmMutation.isPending}
      />

      {/* Faturar pedido */}
      <InvoiceModal
        open={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        loading={invoiceMutation.isPending}
        onConfirm={(pm, due) => {
          if (!invoiceOrder) return;
          invoiceMutation.mutate({ id: invoiceOrder.id, paymentMethod: pm, dueDate: due });
          setInvoiceOrder(null);
        }}
      />

      {/* Desfazer pagamento */}
      <ConfirmModal
        open={!!unpaidOrder} onClose={() => setUnpaidOrder(null)}
        onConfirm={async () => {
          if (!unpaidOrder) return;
          // Cancela o pedido — reverte tudo
          await cancelMutation.mutateAsync(unpaidOrder.id);
          setUnpaidOrder(null);
        }}
        title="Desfazer pagamento"
        description={`Isso cancelará o pedido "${unpaidOrder?.orderNumber}", devolverá o estoque e cancelará a conta a receber no financeiro. Confirma?`}
        confirmLabel="Cancelar pedido"
        loading={cancelMutation.isPending}
      />

      {/* Cancelar pedido */}
      <ConfirmModal
        open={!!cancelOrder} onClose={() => setCancelOrder(null)}
        onConfirm={async () => {
          if (!cancelOrder) return;
          await cancelMutation.mutateAsync(cancelOrder.id);
          setCancelOrder(null);
        }}
        title="Cancelar pedido"
        description={`Cancelar "${cancelOrder?.orderNumber}"? O estoque reservado será liberado e a fatura (se existir) será cancelada.`}
        confirmLabel="Cancelar pedido"
        loading={cancelMutation.isPending}
      />

      {/* Excluir rascunho */}
      <ConfirmModal
        open={!!deleteOrder} onClose={() => setDeleteOrder(null)}
        onConfirm={async () => {
          if (!deleteOrder) return;
          await deleteMutation.mutateAsync(deleteOrder.id);
          setDeleteOrder(null);
        }}
        title="Excluir rascunho"
        description={`Excluir o rascunho "${deleteOrder?.orderNumber}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </motion.div>
  );
}
