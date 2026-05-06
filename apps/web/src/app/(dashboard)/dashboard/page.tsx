'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, Package, Users,
  AlertTriangle, Clock, CheckCircle2, ArrowRight,
  TrendingUp, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/store/auth.store';
import { useDashboardSummary, useDashboardActivity, useDashboardAlerts } from '@/hooks/use-dashboard';
import { StatCard, Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportButton } from '@/components/ui/report-button';
import { formatCurrency, formatDate } from '@/lib/utils';

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg text-xs">
      <p className="font-semibold text-[var(--text)] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="font-medium text-[var(--text)]">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Activity icon map ────────────────────────────────────────────────────────
const activityConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  order_created:    { label: 'Pedido criado',       icon: ShoppingCart,  color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  payment_received: { label: 'Pagamento recebido',  icon: CheckCircle2,  color: 'text-emerald-500',bg: 'bg-emerald-500/10'},
  stock_movement:   { label: 'Movimentação estoque',icon: Package,       color: 'text-purple-500', bg: 'bg-purple-500/10' },
  employee_created: { label: 'Colaborador criado',  icon: Users,         color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item      = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } } };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: summary, isLoading: loadingS, dataUpdatedAt } = useDashboardSummary();
  const { data: activity = [], isLoading: loadingA }          = useDashboardActivity();
  const { data: alerts,  isLoading: loadingAl }               = useDashboardAlerts();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const lastUpdate = dataUpdatedAt ? formatDate(new Date(dataUpdatedAt), 'datetime') : '—';

  const finance   = summary?.finance;
  const sales     = summary?.sales;
  const inventory = summary?.inventory;
  const hr        = summary?.hr;
  const chart     = summary?.chart ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">
            {greeting}, {user?.firstName}! 👋
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
            {formatDate(new Date(), 'long')}
            <span className="text-[var(--text-subtle)]">·</span>
            <RefreshCw className="h-3 w-3" />
            <span className="text-xs text-[var(--text-subtle)]">Atualizado {lastUpdate}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportButton module="general" label="Relatório" size="sm" />
          <Link href="/finance">
            <Button size="sm" variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Ver financeiro
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Receita do Mês"
          value={loadingS ? '...' : formatCurrency(finance?.totalIncome ?? 0)}
          change={finance ? Math.round(((finance.totalIncome - finance.totalExpense) / Math.max(finance.totalIncome, 1)) * 100) : undefined}
          changeLabel="margem líquida"
          icon={<DollarSign />}
          iconColor="text-primary-500"
          loading={loadingS}
        />
        <StatCard
          title="Pedidos no Mês"
          value={loadingS ? '...' : (sales?.ordersThisMonth ?? 0).toLocaleString('pt-BR')}
          change={sales?.awaitingPayment ? undefined : undefined}
          changeLabel={sales?.awaitingPayment ? `${sales.awaitingPayment} aguardando fatura` : undefined}
          icon={<ShoppingCart />}
          iconColor="text-secondary-500"
          loading={loadingS}
        />
        <StatCard
          title="Valor em Estoque"
          value={loadingS ? '...' : formatCurrency(inventory?.stockValue ?? 0)}
          change={inventory?.lowStock ? undefined : undefined}
          changeLabel={inventory?.lowStock ? `${inventory.lowStock} com estoque baixo` : 'estoque saudável'}
          icon={<Package />}
          iconColor="text-warning"
          loading={loadingS}
        />
        <StatCard
          title="Colaboradores Ativos"
          value={loadingS ? '...' : (hr?.activeEmployees ?? 0).toLocaleString('pt-BR')}
          changeLabel={hr ? `Folha: ${formatCurrency(hr.payrollThisMonth)}` : undefined}
          icon={<Users />}
          iconColor="text-success"
          loading={loadingS}
        />
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue vs Expenses */}
        <motion.div variants={item} className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Receita vs Despesas</CardTitle>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Últimos 12 meses</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary-500" />Receita
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-danger" />Despesas
                </span>
              </div>
            </CardHeader>
            {loadingS ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1D4ED8" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="despesasGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="receita"  name="Receita"  stroke="#1D4ED8" strokeWidth={2} fill="url(#receitaGrad)"  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#EF4444" strokeWidth={2} fill="url(#despesasGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Finance summary */}
        <motion.div variants={item}>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div>
                <CardTitle>Financeiro do Mês</CardTitle>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Resumo consolidado</p>
              </div>
            </CardHeader>
            {loadingS ? (
              <div className="space-y-3 flex-1">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {[
                  { label: 'Receitas pagas',    value: finance?.totalIncome    ?? 0, color: 'text-success'  },
                  { label: 'Despesas pagas',    value: finance?.totalExpense   ?? 0, color: 'text-danger'   },
                  { label: 'Saldo líquido',     value: finance?.netBalance     ?? 0, color: (finance?.netBalance ?? 0) >= 0 ? 'text-success' : 'text-danger' },
                  { label: 'A receber',         value: finance?.pendingIncome  ?? 0, color: 'text-warning'  },
                  { label: 'Contas vencidas',   value: finance?.overdueAmount  ?? 0, color: 'text-danger'   },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-xs text-[var(--text-muted)]">{row.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${row.color}`}>
                      {formatCurrency(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <Link href="/finance">
                <Button variant="ghost" size="sm" fullWidth rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Ver financeiro completo
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Alerts + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Alerts */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <CardTitle>Alertas Operacionais</CardTitle>
              </div>
            </CardHeader>

            {loadingAl ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="space-y-4">
                {/* Low stock */}
                {(alerts?.lowStock?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                      Estoque Baixo ({alerts!.lowStock.length})
                    </p>
                    <div className="space-y-1.5">
                      {alerts!.lowStock.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <div>
                            <p className="text-xs font-medium text-[var(--text)]">{p.name}</p>
                            {p.sku && <p className="text-[10px] text-[var(--text-subtle)]">#{p.sku}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-orange-500">{p.stock_quantity} un</p>
                            <p className="text-[10px] text-[var(--text-subtle)]">mín {p.min_stock}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link href="/inventory/products?lowStock=true">
                      <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">Ver todos →</Button>
                    </Link>
                  </div>
                )}

                {/* Overdue */}
                {(alerts?.overdue?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                      Contas Vencidas ({alerts!.overdue.length})
                    </p>
                    <div className="space-y-1.5">
                      {alerts!.overdue.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                          <div>
                            <p className="text-xs font-medium text-[var(--text)] truncate max-w-[160px]">{t.description}</p>
                            <p className="text-[10px] text-[var(--text-subtle)]">{formatDate(t.due_date)}</p>
                          </div>
                          <p className="text-xs font-bold text-danger">{formatCurrency(t.amount)}</p>
                        </div>
                      ))}
                    </div>
                    <Link href="/finance/payable">
                      <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">Ver todas →</Button>
                    </Link>
                  </div>
                )}

                {/* Awaiting invoice */}
                {(alerts?.awaitingInvoice?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                      Pedidos Aguardando Fatura ({alerts!.awaitingInvoice.length})
                    </p>
                    <div className="space-y-1.5">
                      {alerts!.awaitingInvoice.map((o) => (
                        <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                          <div>
                            <p className="text-xs font-medium text-[var(--text)]">{o.order_number}</p>
                            {o.customer && <p className="text-[10px] text-[var(--text-subtle)]">{o.customer}</p>}
                          </div>
                          <p className="text-xs font-bold text-blue-500">{formatCurrency(o.total)}</p>
                        </div>
                      ))}
                    </div>
                    <Link href="/sales/orders">
                      <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">Ver pedidos →</Button>
                    </Link>
                  </div>
                )}

                {/* No alerts */}
                {!loadingAl && (alerts?.lowStock?.length ?? 0) === 0 &&
                  (alerts?.overdue?.length ?? 0) === 0 &&
                  (alerts?.awaitingInvoice?.length ?? 0) === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                    <p className="text-sm font-medium text-[var(--text)]">Tudo em ordem!</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Nenhum alerta operacional no momento</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Activity feed */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                <CardTitle>Atividade Recente</CardTitle>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Últimas 20 ações</p>
            </CardHeader>

            {loadingA ? (
              <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-[var(--text-subtle)] mb-2" />
                <p className="text-sm text-[var(--text-muted)]">Nenhuma atividade ainda</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {activity.map((act, i) => {
                  const cfg  = activityConfig[act.type] ?? activityConfig.order_created;
                  const Icon = cfg.icon;
                  return (
                    <div key={`${act.resource_id}-${i}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
                      <div className={`p-1.5 rounded-lg shrink-0 ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text)] truncate">{act.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {cfg.label} · {act.subtitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {Number(act.amount) > 0 && (
                          <p className="text-xs font-semibold tabular-nums text-[var(--text)]">
                            {formatCurrency(Number(act.amount))}
                          </p>
                        )}
                        <p className="text-[10px] text-[var(--text-subtle)]">
                          {formatDate(act.occurred_at, 'relative')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Quick links */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: '/finance',   label: 'Financeiro', icon: DollarSign,  color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
            { href: '/sales',     label: 'Vendas',     icon: ShoppingCart,color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { href: '/inventory', label: 'Estoque',    icon: Package,     color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { href: '/hr',        label: 'RH',         icon: Users,       color: 'text-emerald-500',bg: 'bg-emerald-500/10'},
            { href: '/reports',   label: 'Relatórios', icon: TrendingUp,  color: 'text-pink-500',   bg: 'bg-pink-500/10'   },
            { href: '/hr/users',  label: 'Usuários',   icon: Users,       color: 'text-cyan-500',   bg: 'bg-cyan-500/10'   },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card hover className="flex flex-col items-center gap-2 py-4 text-center cursor-pointer group">
                  <div className={`p-2 rounded-lg ${link.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                  <p className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                    {link.label}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </motion.div>

    </motion.div>
  );
}
