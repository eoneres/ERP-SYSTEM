'use client';

import { useState, useMemo, useCallback } from 'react';
import { Activity, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Plus } from 'lucide-react';
import { useMovements, useProducts, useWarehouses } from '@/hooks/use-inventory';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { MovementModal } from '@/components/modules/inventory/movement-modal';
import { formatCurrency } from '@/lib/utils';
import type { StockMovement, MovementType } from '@/lib/api/inventory.api';

const typeConfig: Record<MovementType, { label: string; variant: any; sign: '+' | '-' | '=' }> = {
  in:       { label: 'Entrada',    variant: 'success', sign: '+' },
  out:      { label: 'Saída',      variant: 'danger',  sign: '-' },
  transfer: { label: 'Transferência', variant: 'warning', sign: '-' },
  adjust:   { label: 'Ajuste',     variant: 'primary', sign: '=' },
  return:   { label: 'Devolução',  variant: 'success', sign: '+' },
  loss:     { label: 'Perda',      variant: 'danger',  sign: '-' },
};

const reasonLabels: Record<string, string> = {
  purchase: 'Compra', sale: 'Venda', return_in: 'Dev. Cliente', return_out: 'Dev. Fornecedor',
  transfer: 'Transferência', adjustment: 'Ajuste', loss: 'Perda', production: 'Produção', other: 'Outro',
};

export default function MovementsPage() {
  const [page,        setPage]        = useState(1);
  const [limit,       setLimit]       = useState(20);
  const [type,        setType]        = useState('');
  const [productId,   setProductId]   = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [modalOpen,   setModalOpen]   = useState(false);

  const filter = useMemo(() => ({
    page, limit,
    type:        (type as MovementType)       || undefined,
    productId:   productId    || undefined,
    warehouseId: warehouseId  || undefined,
    dateFrom:    dateFrom     || undefined,
    dateTo:      dateTo       || undefined,
  }), [page, limit, type, productId, warehouseId, dateFrom, dateTo]);

  const { data, isLoading }         = useMovements(filter);
  const { data: productsData }      = useProducts({ limit: 200 });
  const { data: warehouses = [] }   = useWarehouses();

  const movements = data?.data  ?? [];
  const total     = data?.meta?.total ?? 0;
  const products  = productsData?.data ?? [];

  const fieldClass =
    'h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

  const columns: Column<StockMovement>[] = [
    {
      key: 'movementDate',
      header: 'Data',
      sortable: true,
      render: (m) => (
        <span className="text-sm text-[var(--text-muted)]">
          {new Date(m.movementDate).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Produto',
      render: (m) => (
        <div>
          <p className="text-sm font-medium text-[var(--text)]">{m.product?.name ?? '—'}</p>
          {m.product?.sku && (
            <p className="text-[10px] text-[var(--text-subtle)]">#{m.product.sku}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (m) => {
        const cfg = typeConfig[m.type] ?? typeConfig.in;
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
            {m.reason && (
              <span className="text-[10px] text-[var(--text-subtle)]">
                {reasonLabels[m.reason] ?? m.reason}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Quantidade',
      render: (m) => {
        const cfg = typeConfig[m.type] ?? typeConfig.in;
        const isPositive = cfg.sign === '+';
        return (
          <span className={`text-sm font-bold ${
            cfg.sign === '=' ? 'text-blue-500' :
            isPositive ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {cfg.sign}{m.quantity} {m.product?.unit ?? ''}
          </span>
        );
      },
    },
    {
      key: 'stockBefore',
      header: 'Saldo',
      render: (m) => (
        <div className="text-xs text-[var(--text-muted)]">
          <span>{m.stockBefore}</span>
          <span className="mx-1 text-[var(--text-subtle)]">→</span>
          <span className="font-medium text-[var(--text)]">{m.stockAfter}</span>
        </div>
      ),
    },
    {
      key: 'unitCost',
      header: 'Custo Unit.',
      render: (m) => (
        <span className="text-sm text-[var(--text-muted)]">
          {m.unitCost ? formatCurrency(m.unitCost) : '—'}
        </span>
      ),
    },
    {
      key: 'counterpartName',
      header: 'Fornecedor / Cliente',
      render: (m) => (
        <div>
          <p className="text-sm text-[var(--text-muted)]">{m.counterpartName ?? '—'}</p>
          {m.referenceNumber && (
            <p className="text-[10px] text-[var(--text-subtle)]">Ref: {m.referenceNumber}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Movimentações</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Histórico de entradas, saídas e ajustes de estoque
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Movimentação
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className={fieldClass}
        >
          <option value="">Todos os tipos</option>
          <option value="in">Entrada</option>
          <option value="out">Saída</option>
          <option value="adjust">Ajuste</option>
          <option value="transfer">Transferência</option>
          <option value="return">Devolução</option>
          <option value="loss">Perda</option>
        </select>

        <select
          value={productId}
          onChange={(e) => { setProductId(e.target.value); setPage(1); }}
          className={fieldClass + ' max-w-[200px]'}
        >
          <option value="">Todos os produtos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {warehouses.length > 0 && (
          <select
            value={warehouseId}
            onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
            className={fieldClass}
          >
            <option value="">Todos os depósitos</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className={fieldClass}
          />
          <span className="text-[var(--text-subtle)] text-sm">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className={fieldClass}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={movements}
        loading={isLoading}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        emptyIcon={<Activity className="h-10 w-10 text-[var(--text-subtle)]" />}
        emptyTitle="Nenhuma movimentação encontrada"
        emptyDescription="Registre entradas e saídas de estoque para visualizá-las aqui"
      />

      <MovementModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
