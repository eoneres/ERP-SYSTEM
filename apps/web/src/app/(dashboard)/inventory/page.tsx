'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Package, AlertTriangle, TrendingDown, DollarSign,
  ArrowDownCircle, ArrowUpCircle, Plus, Activity,
} from 'lucide-react';
import { useInventorySummary, useLowStockProducts, useMovements } from '@/hooks/use-inventory';
import { Card, Stat } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductModal }  from '@/components/modules/inventory/product-modal';
import { MovementModal } from '@/components/modules/inventory/movement-modal';
import { formatCurrency } from '@/lib/utils';

const movementTypeConfig: Record<string, { label: string; variant: any; icon: any }> = {
  in:       { label: 'Entrada',  variant: 'success', icon: ArrowDownCircle },
  out:      { label: 'Saída',    variant: 'danger',  icon: ArrowUpCircle   },
  adjust:   { label: 'Ajuste',   variant: 'primary', icon: Activity        },
  transfer: { label: 'Transfer', variant: 'warning', icon: Activity        },
  return:   { label: 'Devolução',variant: 'success', icon: ArrowDownCircle },
  loss:     { label: 'Perda',    variant: 'danger',  icon: TrendingDown    },
};

export default function InventoryPage() {
  const [productModalOpen,  setProductModalOpen]  = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useInventorySummary();
  const { data: lowStock = [],  isLoading: lowStockLoading  } = useLowStockProducts();
  const { data: movementsData, isLoading: movementsLoading } = useMovements({ limit: 8 });
  const recentMovements = movementsData?.data ?? [];

  const cards = [
    {
      label:   'Total de Produtos',
      value:   summary?.totalProducts ?? 0,
      sub:     `${summary?.activeProducts ?? 0} ativos`,
      icon:    Package,
      color:   'text-blue-500',
      bg:      'bg-blue-500/10',
    },
    {
      label:   'Estoque Baixo',
      value:   summary?.lowStockProducts ?? 0,
      sub:     `${summary?.outOfStockCount ?? 0} sem estoque`,
      icon:    AlertTriangle,
      color:   'text-orange-500',
      bg:      'bg-orange-500/10',
      alert:   (summary?.lowStockProducts ?? 0) > 0,
    },
    {
      label:   'Valor em Estoque',
      value:   formatCurrency(summary?.totalStockValue ?? 0),
      sub:     'custo total',
      icon:    DollarSign,
      color:   'text-emerald-500',
      bg:      'bg-emerald-500/10',
      isText:  true,
    },
    {
      label:   'Movimentações Hoje',
      value:   summary?.movementsToday ?? 0,
      sub:     'entradas e saídas',
      icon:    Activity,
      color:   'text-purple-500',
      bg:      'bg-purple-500/10',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Estoque</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Gerencie produtos, movimentações e depósitos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMovementModalOpen(true)}
          >
            <Activity className="h-4 w-4 mr-1.5" />
            Nova Movimentação
          </Button>
          <Button size="sm" onClick={() => setProductModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className={card.alert ? 'border-orange-500/40 bg-orange-500/5' : ''}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">{card.label}</p>
                    {summaryLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-[var(--text)]">
                        {card.isText ? card.value : card.value.toLocaleString('pt-BR')}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-subtle)] mt-1">{card.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Low stock alert */}
        <div className="col-span-1">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Estoque Baixo
              </h2>
              <Link
                href="/inventory/products?lowStock=true"
                className="text-xs text-primary-500 hover:underline"
              >
                Ver todos
              </Link>
            </div>

            {lowStockLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : lowStock.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-[var(--text-subtle)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)]">Todos os estoques estão OK</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text)] truncate">{p.name}</p>
                      {p.sku && <p className="text-[10px] text-[var(--text-subtle)]">#{p.sku}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-xs font-bold ${p.stockQuantity === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                        {p.stockQuantity} {p.unit}
                      </p>
                      <p className="text-[10px] text-[var(--text-subtle)]">mín {p.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent movements */}
        <div className="col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text)]">Movimentações Recentes</h2>
              <Link
                href="/inventory/movements"
                className="text-xs text-primary-500 hover:underline"
              >
                Ver todas
              </Link>
            </div>

            {movementsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentMovements.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-[var(--text-subtle)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-muted)]">Nenhuma movimentação ainda</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setMovementModalOpen(true)}
                >
                  Registrar primeira movimentação
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentMovements.map((m) => {
                  const cfg = movementTypeConfig[m.type] ?? movementTypeConfig.in;
                  const Icon = cfg.icon;
                  const isPositive = m.type === 'in' || m.type === 'return';
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <Icon className={`h-3.5 w-3.5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text)] truncate">
                          {m.product?.name ?? 'Produto removido'}
                        </p>
                        <p className="text-[10px] text-[var(--text-subtle)]">
                          {new Date(m.movementDate).toLocaleDateString('pt-BR')}
                          {m.counterpartName ? ` · ${m.counterpartName}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{m.quantity} {m.product?.unit ?? ''}
                        </p>
                        <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: '/inventory/products',   label: 'Catálogo de Produtos',  icon: Package,        desc: 'Gerencie todos os produtos' },
          { href: '/inventory/movements',  label: 'Movimentações',         icon: Activity,       desc: 'Histórico de entradas e saídas' },
          { href: '/inventory/warehouses', label: 'Depósitos',             icon: TrendingDown,   desc: 'Gerencie seus depósitos' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:border-primary-500/40 hover:bg-primary-500/5 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--surface-2)] group-hover:bg-primary-500/10 transition-colors">
                    <Icon className="h-5 w-5 text-[var(--text-muted)] group-hover:text-primary-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <ProductModal  open={productModalOpen}  onClose={() => setProductModalOpen(false)} />
      <MovementModal open={movementModalOpen} onClose={() => setMovementModalOpen(false)} />
    </div>
  );
}
