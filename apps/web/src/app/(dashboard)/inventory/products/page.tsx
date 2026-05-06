'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Package, AlertTriangle } from 'lucide-react';
import { useProducts, useDeleteProduct, useProductCategories } from '@/hooks/use-inventory';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button }  from '@/components/ui/button';
import { Badge }   from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/modal';
import { ProductModal }  from '@/components/modules/inventory/product-modal';
import { MovementModal } from '@/components/modules/inventory/movement-modal';
import { formatCurrency } from '@/lib/utils';
import type { Product, ProductStatus, MovementType } from '@/lib/api/inventory.api';

const statusConfig: Record<ProductStatus, { label: string; variant: any }> = {
  active:   { label: 'Ativo',      variant: 'success' },
  inactive: { label: 'Inativo',    variant: 'default' },
  draft:    { label: 'Rascunho',   variant: 'warning' },
};

const unitLabels: Record<string, string> = {
  unit: 'un', kg: 'kg', g: 'g', l: 'l', ml: 'ml',
  m: 'm', cm: 'cm', box: 'cx', pack: 'pct',
};

export default function ProductsPage() {
  const [page,      setPage]      = useState(1);
  const [limit,     setLimit]     = useState(20);
  const [search,    setSearch]    = useState('');
  const [sortBy,    setSortBy]    = useState('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [category,  setCategory]  = useState('');
  const [status,    setStatus]    = useState('');
  const [lowStock,  setLowStock]  = useState(false);

  const [productModal,  setProductModal]  = useState(false);
  const [editProduct,   setEditProduct]   = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [movementFor,   setMovementFor]   = useState<{ product: Product; type: MovementType } | null>(null);

  const filter = useMemo(() => ({
    page, limit, search, sortBy, sortOrder,
    category: category || undefined,
    status:   (status as any) || undefined,
    lowStock: lowStock || undefined,
  }), [page, limit, search, sortBy, sortOrder, category, status, lowStock]);

  const { data, isLoading } = useProducts(filter);
  const { data: categories = [] } = useProductCategories();
  const deleteProductMutation = useDeleteProduct();

  const products = data?.data ?? [];
  const total    = data?.meta?.total ?? 0;

  const handleSort = useCallback((col: string, order: 'ASC' | 'DESC') => {
    setSortBy(col);
    setSortOrder(order);
    setPage(1);
  }, []);

  const handleSearch = useCallback((s: string) => {
    setSearch(s);
    setPage(1);
  }, []);

  const confirmDelete = async () => {
    if (!deleteProduct) return;
    await deleteProductMutation.mutateAsync(deleteProduct.id);
    setDeleteProduct(null);
  };

  const fieldClass =
    'h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Produto',
      sortable: true,
      render: (p) => (
        <div>
          <p className="text-sm font-medium text-[var(--text)]">{p.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {p.sku     && <span className="text-[10px] text-[var(--text-subtle)]">SKU {p.sku}</span>}
            {p.barcode && <span className="text-[10px] text-[var(--text-subtle)]">· {p.barcode}</span>}
            {p.brand   && <span className="text-[10px] text-[var(--text-subtle)]">· {p.brand}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      sortable: true,
      render: (p) => (
        <span className="text-sm text-[var(--text-muted)]">{p.category ?? '—'}</span>
      ),
    },
    {
      key: 'stockQuantity',
      header: 'Estoque',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-1.5">
          {p.isLowStock && (
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          )}
          <span className={`text-sm font-medium ${
            p.stockQuantity === 0 ? 'text-red-500' :
            p.isLowStock ? 'text-orange-500' : 'text-[var(--text)]'
          }`}>
            {p.stockQuantity} {unitLabels[p.unit] ?? p.unit}
          </span>
          {p.minStock > 0 && (
            <span className="text-[10px] text-[var(--text-subtle)]">/ mín {p.minStock}</span>
          )}
        </div>
      ),
    },
    {
      key: 'costPrice',
      header: 'Custo',
      sortable: true,
      render: (p) => (
        <span className="text-sm text-[var(--text-muted)]">{formatCurrency(p.costPrice)}</span>
      ),
    },
    {
      key: 'salePrice',
      header: 'Venda',
      sortable: true,
      render: (p) => (
        <span className="text-sm font-medium text-[var(--text)]">{formatCurrency(p.salePrice)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const cfg = statusConfig[p.status];
        return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => setMovementFor({ product: p, type: 'in' })}
            className="p-1.5 rounded-md hover:bg-emerald-500/10 text-[var(--text-muted)] hover:text-emerald-600 transition-colors"
            title="Entrada de estoque"
          >
            <ArrowDownCircle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setMovementFor({ product: p, type: 'out' })}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors"
            title="Saída de estoque"
          >
            <ArrowUpCircle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setEditProduct(p); setProductModal(true); }}
            className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteProduct(p)}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Produtos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {total > 0 ? `${total} produto${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}` : 'Nenhum produto ainda'}
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditProduct(null); setProductModal(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Produto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className={fieldClass}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={fieldClass}
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="draft">Rascunho</option>
        </select>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
            className="rounded"
          />
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
          Somente estoque baixo
        </label>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={products}
        loading={isLoading}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        onSearch={handleSearch}
        onSort={handleSort}
        searchPlaceholder="Buscar por nome, SKU ou código de barras..."
        emptyIcon={<Package className="h-10 w-10 text-[var(--text-subtle)]" />}
        emptyTitle="Nenhum produto encontrado"
        emptyDescription="Crie seu primeiro produto clicando no botão acima"
      />

      {/* Modals */}
      <ProductModal
        open={productModal}
        onClose={() => { setProductModal(false); setEditProduct(null); }}
        product={editProduct}
      />

      <MovementModal
        open={!!movementFor}
        onClose={() => setMovementFor(null)}
        product={movementFor?.product}
        defaultType={movementFor?.type}
      />

      <ConfirmModal
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={confirmDelete}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${deleteProduct?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
