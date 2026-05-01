'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import dayjs from 'dayjs';
import { useUIStore } from '@/store/ui.store';
import { useCashFlow } from '@/hooks/use-finance';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-surface-lg text-xs space-y-1.5">
      <p className="font-semibold text-[var(--text)]">{dayjs(label).format('MMM/YYYY')}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const PERIODS = [
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
];

export default function CashFlowPage() {
  const { setPageTitle, setBreadcrumbs } = useUIStore();
  const [period, setPeriod] = useState(6);

  useEffect(() => {
    setPageTitle('Fluxo de Caixa');
    setBreadcrumbs([
      { label: 'Financeiro', href: '/finance' },
      { label: 'Fluxo de Caixa' },
    ]);
  }, [setPageTitle, setBreadcrumbs]);

  const dateFrom = dayjs().subtract(period - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const dateTo = dayjs().endOf('month').format('YYYY-MM-DD');

  const { data: cashflow = [], isLoading } = useCashFlow(dateFrom, dateTo, 'month');

  const totalIncome = cashflow.reduce((s, c) => s + c.income, 0);
  const totalExpense = cashflow.reduce((s, c) => s + c.expense, 0);
  const finalBalance = cashflow[cashflow.length - 1]?.accumulated ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Fluxo de Caixa</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {dayjs(dateFrom).format('MMM/YYYY')} → {dayjs(dateTo).format('MMM/YYYY')}
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.months}
              variant={period === p.months ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.months)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de Entradas', value: totalIncome, color: 'text-success' },
          { label: 'Total de Saídas', value: totalExpense, color: 'text-danger' },
          { label: 'Saldo Acumulado', value: finalBalance, color: finalBalance >= 0 ? 'text-success' : 'text-danger' },
        ].map((s) => (
          <Card key={s.label}>
            <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-1 ${s.color}`}>
              {formatCurrency(s.value)}
            </p>
          </Card>
        ))}
      </div>

      {/* Main chart */}
      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas vs Saldo Acumulado</CardTitle>
          <div className="flex gap-3 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Receitas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />Despesas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-500" />Acumulado</span>
          </div>
        </CardHeader>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflow} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="accumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => dayjs(v).format('MMM')} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="income" name="Receitas" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
              <Area type="monotone" dataKey="expense" name="Despesas" stroke="#EF4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
              <Area type="monotone" dataKey="accumulated" name="Acumulado" stroke="#1D4ED8" strokeWidth={2} fill="url(#accumGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detail table */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <CardTitle>Detalhamento Mensal</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {['Mês', 'Entradas', 'Saídas', 'Saldo do Mês', 'Acumulado'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: period }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="skeleton h-4 w-20 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : cashflow.map((row, i) => (
                    <tr key={row.date} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text)]">
                        {dayjs(row.date).format('MMMM [de] YYYY')}
                      </td>
                      <td className="px-4 py-3 text-success font-semibold tabular-nums">
                        +{formatCurrency(row.income)}
                      </td>
                      <td className="px-4 py-3 text-danger font-semibold tabular-nums">
                        -{formatCurrency(row.expense)}
                      </td>
                      <td className={`px-4 py-3 font-semibold tabular-nums ${row.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                        {row.balance >= 0 ? '+' : ''}{formatCurrency(row.balance)}
                      </td>
                      <td className={`px-4 py-3 font-bold tabular-nums ${row.accumulated >= 0 ? 'text-[var(--text)]' : 'text-danger'}`}>
                        {formatCurrency(row.accumulated)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}
