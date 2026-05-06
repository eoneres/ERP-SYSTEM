'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, UserCheck, DollarSign, Clock, Plus, UserCog } from 'lucide-react';
import { useHRSummary } from '@/hooks/use-hr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeModal } from '@/components/modules/hr/employee-modal';
import { formatCurrency } from '@/lib/utils';

export default function HRPage() {
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const { data: summary, isLoading } = useHRSummary();

  const cards = [
    { label: 'Total de Colaboradores', value: summary?.totalEmployees ?? 0,  sub: `${summary?.activeEmployees ?? 0} ativos`, icon: Users,    color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
    { label: 'Colaboradores Ativos',   value: summary?.activeEmployees ?? 0, sub: 'em atividade',                             icon: UserCheck, color: 'text-emerald-500',bg: 'bg-emerald-500/10'},
    { label: 'Folha do Mês',           value: formatCurrency(summary?.payrollThisMonth ?? 0), sub: 'custo total líquido', icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10', isText: true },
    { label: 'Usuários do Sistema',    value: summary?.totalUsers ?? 0,      sub: 'com acesso ativo',                         icon: UserCog,   color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Recursos Humanos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Colaboradores, usuários e folha de pagamento</p>
        </div>
        <Button size="sm" onClick={() => setEmpModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Novo Colaborador
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">{card.label}</p>
                    {isLoading ? <Skeleton className="h-7 w-16" /> : (
                      <p className="text-2xl font-bold text-[var(--text)]">
                        {(card as any).isText ? card.value : (card.value as number).toLocaleString('pt-BR')}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-subtle)] mt-1">{card.sub}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}><Icon className={`h-5 w-5 ${card.color}`} /></div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { href: '/hr/employees',  label: 'Colaboradores',      icon: Users,    desc: 'Cadastro e gestão de colaboradores' },
          { href: '/hr/users',      label: 'Usuários do Sistema', icon: UserCog,  desc: 'Acesso, roles e permissões'         },
          { href: '/hr/payroll',    label: 'Folha de Pagamento',  icon: DollarSign, desc: 'Processamento e histórico'        },
          { href: '/hr/attendance', label: 'Controle de Ponto',   icon: Clock,    desc: 'Registros de entrada e saída'       },
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

      <EmployeeModal open={empModalOpen} onClose={() => setEmpModalOpen(false)} />
    </div>
  );
}
