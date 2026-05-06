'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { usePayrolls, useCreatePayroll, useUpdatePayroll, useEmployees } from '@/hooks/use-hr';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { Payroll } from '@/lib/api/hr.api';

const statusConfig: Record<string, { label: string; variant: any }> = {
  draft:     { label: 'Rascunho',    variant: 'default'  },
  processed: { label: 'Processado',  variant: 'primary'  },
  paid:      { label: 'Pago',        variant: 'success'  },
  cancelled: { label: 'Cancelado',   variant: 'danger'   },
};

const fc = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

export default function PayrollPage() {
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [empId, setEmpId] = useState('');

  const filter = useMemo(() => ({ page, limit }), [page, limit]);
  const { data, isLoading } = usePayrolls(filter);
  const payrolls   = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const { data: empData } = useEmployees({ limit: 200, status: 'active' });
  const employees = (empData as any)?.data ?? [];

  const createMutation = useCreatePayroll();
  const updateMutation = useUpdatePayroll();

  const handleCreate = async () => {
    if (!empId || !month) return;
    await createMutation.mutateAsync({ employeeId: empId, referenceMonth: month });
    setModalOpen(false);
    setEmpId('');
  };

  const columns: Column<Payroll>[] = [
    {
      key: 'employee', header: 'Colaborador',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-[var(--text)]">{row.employee?.fullName ?? '—'}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.employee?.position}</p>
        </div>
      ),
    },
    { key: 'referenceMonth', header: 'Competência', width: '120px', cell: (row) => <span className="text-sm font-mono">{row.referenceMonth}</span> },
    { key: 'baseSalary',    header: 'Salário Base',  align: 'right', width: '120px', cell: (row) => <span className="tabular-nums text-sm">{formatCurrency(row.baseSalary)}</span> },
    { key: 'inssDeduction', header: 'INSS',          align: 'right', width: '100px', cell: (row) => <span className="tabular-nums text-sm text-danger">- {formatCurrency(row.inssDeduction)}</span> },
    { key: 'irrfDeduction', header: 'IRRF',          align: 'right', width: '100px', cell: (row) => <span className="tabular-nums text-sm text-danger">- {formatCurrency(row.irrfDeduction)}</span> },
    { key: 'netSalary',     header: 'Líquido',       align: 'right', width: '120px', cell: (row) => <span className="tabular-nums text-sm font-bold text-success">{formatCurrency(row.netSalary)}</span> },
    { key: 'status',        header: 'Status',        width: '110px', cell: (row) => <Badge variant={statusConfig[row.status]?.variant} dot size="sm">{statusConfig[row.status]?.label}</Badge> },
    {
      key: 'actions' as any, header: '', align: 'right', width: '100px',
      cell: (row) => row.status === 'draft' ? (
        <Button size="xs" variant="outline"
          loading={updateMutation.isPending}
          onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: row.id, data: { status: 'paid', paymentDate: new Date().toISOString().slice(0, 10) } }); }}
        >
          Marcar Pago
        </Button>
      ) : null,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Folha de Pagamento</h2>
          <p className="text-sm text-[var(--text-muted)]">{pagination?.total ?? 0} registros</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
          Gerar Folha
        </Button>
      </div>

      <DataTable
        columns={columns} data={payrolls} loading={isLoading}
        pagination={pagination} onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        rowKey="id"
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">💰</div>
            <p className="text-sm font-medium text-[var(--text)]">Nenhuma folha gerada</p>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="mt-4" onClick={() => setModalOpen(true)}>Gerar Folha</Button>
          </div>
        }
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Gerar Folha de Pagamento" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Colaborador</label>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} className={fc}>
              <option value="">— Selecione —</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Competência (YYYY-MM)</label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <p className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] rounded-lg p-3">
            O sistema calculará automaticamente INSS, IRRF e FGTS com base no salário do colaborador.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" loading={createMutation.isPending} onClick={handleCreate} disabled={!empId || !month}>
              Gerar Folha
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
