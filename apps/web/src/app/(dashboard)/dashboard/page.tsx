'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, ShoppingCart, Package, Users,
  TrendingUp, TrendingDown, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { StatCard, Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDate } from '@/lib/utils';

// ─── Mock data (replace with real API calls via TanStack Query) ───────────────
const revenueData = [
  { month: 'Jan', receita: 42000, despesas: 28000 },
  { month: 'Fev', receita: 53000, despesas: 31000 },
  { month: 'Mar', receita: 47000, despesas: 29000 },
  { month: 'Abr', receita: 61000, despesas: 34000 },
  { month: 'Mai', receita: 55000, despesas: 32000 },
  { month: 'Jun', receita: 72000, despesas: 38000 },
  { month: 'Jul', receita: 68000, despesas: 36000 },
];

const salesByCategory = [
  { name: 'Eletrônicos', value: 38, color: '#1D4ED8' },
  { name: 'Vestuário', value: 27, color: '#6D28D9' },
  { name: 'Alimentos', value: 19, color: '#10B981' },
  { name: 'Outros', value: 16, color: '#F59E0B' },
];

const recentOrders = [
  { id: '#4521', client: 'Ana Costa', amount: 2450, status: 'paid', date: new Date() },
  { id: '#4520', client: 'Pedro Lima', amount: 890, status: 'pending', date: new Date() },
  { id: '#4519', client: 'Carla Souza', amount: 5200, status: 'paid', date: new Date() },
  { id: '#4518', client: 'João Silva', amount: 340, status: 'cancelled', date: new Date() },
  { id: '#4517', client: 'Maria Dias', amount: 1780, status: 'paid', date: new Date() },
];

const statusConfig: Record<string, { label: string; variant: any }> = {
  paid: { label: 'Pago', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-surface-lg text-xs">
      <p className="font-semibold text-[var(--text)] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="font-medium text-[var(--text)]">
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { setPageTitle, setBreadcrumbs } = useUIStore();
  const { user } = useAuthStore();

  useEffect(() => {
    setPageTitle('Dashboard');
    setBreadcrumbs([{ label: 'Dashboard' }]);
  }, [setPageTitle, setBreadcrumbs]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome header */}
      <motion.div variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">
            {greeting}, {user?.firstName}! 👋
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {formatDate(new Date(), 'long')} — Aqui está o resumo do seu negócio.
          </p>
        </div>
        <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
          Ver relatório completo
        </Button>
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Receita Mensal"
          value={formatCurrency(72000)}
          change={12.5}
          changeLabel="vs mês anterior"
          icon={<DollarSign />}
          iconColor="text-primary-500"
        />
        <StatCard
          title="Pedidos do Mês"
          value="248"
          change={8.2}
          changeLabel="vs mês anterior"
          icon={<ShoppingCart />}
          iconColor="text-secondary-500"
        />
        <StatCard
          title="Itens em Estoque"
          value="1.842"
          change={-3.1}
          changeLabel="vs semana anterior"
          icon={<Package />}
          iconColor="text-warning"
        />
        <StatCard
          title="Funcionários Ativos"
          value="37"
          change={5.4}
          changeLabel="vs mês anterior"
          icon={<Users />}
          iconColor="text-success"
        />
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <motion.div variants={item} className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Receita vs Despesas</CardTitle>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Últimos 7 meses</p>
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
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="despesasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    name="Receita"
                    stroke="#1D4ED8"
                    strokeWidth={2}
                    fill="url(#receitaGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    name="Despesas"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#despesasGrad)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Sales by category pie */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Vendas por Categoria</CardTitle>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Este mês</p>
              </div>
            </CardHeader>
            <div className="h-36 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {salesByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Participação']}
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {salesByCategory.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-[var(--text-muted)]">{cat.name}</span>
                  </div>
                  <span className="font-semibold text-[var(--text)] tabular-nums">{cat.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent orders */}
      <motion.div variants={item}>
        <Card padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Pedidos Recentes</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Últimas transações</p>
            </div>
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              Ver todos
            </Button>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {recentOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
              >
                <Avatar name={order.client} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{order.client}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {order.id} · {formatDate(order.date, 'relative')}
                  </p>
                </div>
                <Badge
                  variant={statusConfig[order.status]?.variant}
                  dot
                  size="sm"
                >
                  {statusConfig[order.status]?.label}
                </Badge>
                <p className="text-sm font-semibold text-[var(--text)] tabular-nums w-24 text-right">
                  {formatCurrency(order.amount)}
                </p>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
