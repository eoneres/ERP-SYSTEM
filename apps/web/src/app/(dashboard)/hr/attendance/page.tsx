'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, LogIn, LogOut } from 'lucide-react';
import { useTimeRecords, useCreateTimeRecord, useCheckOut, useEmployees } from '@/hooks/use-hr';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import type { TimeRecord } from '@/lib/api/hr.api';

const typeConfig: Record<string, { label: string; variant: any }> = {
  regular:  { label: 'Regular',   variant: 'default' },
  overtime: { label: 'Extra',     variant: 'warning' },
  absence:  { label: 'Falta',     variant: 'danger'  },
  vacation: { label: 'Férias',    variant: 'primary' },
  holiday:  { label: 'Feriado',   variant: 'primary' },
};

const fc = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

function formatMinutes(min?: number) {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? `${m}m` : ''}`;
}

export default function AttendancePage() {
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [empId, setEmpId]         = useState('');
  const [checkIn, setCheckIn]     = useState(new Date().toISOString().slice(0, 16));
  const [type, setType]           = useState('regular');

  const filter = useMemo(() => ({ page, limit }), [page, limit]);
  const { data, isLoading } = useTimeRecords(filter);
  const records    = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const { data: empData } = useEmployees({ limit: 200, status: 'active' });
  const employees = (empData as any)?.data ?? [];

  const createMutation = useCreateTimeRecord();
  const checkOutMutation = useCheckOut();

  const handleCreate = async () => {
    if (!empId || !checkIn) return;
    await createMutation.mutateAsync({ employeeId: empId, checkIn, type: type as any });
    setModalOpen(false);
    setEmpId('');
  };

  const columns: Column<TimeRecord>[] = [
    {
      key: 'employee', header: 'Colaborador',
      cell: (row) => <p className="text-sm font-medium text-[var(--text)]">{row.employee?.fullName ?? '—'}</p>,
    },
    {
      key: 'checkIn', header: 'Entrada', width: '160px',
      cell: (row) => <span className="text-sm tabular-nums">{new Date(row.checkIn).toLocaleString('pt-BR')}</span>,
    },
    {
      key: 'checkOut', header: 'Saída', width: '160px',
      cell: (row) => row.checkOut
        ? <span className="text-sm tabular-nums">{new Date(row.checkOut).toLocaleString('pt-BR')}</span>
        : (
          <Button size="xs" variant="outline"
            loading={checkOutMutation.isPending}
            onClick={(e) => { e.stopPropagation(); checkOutMutation.mutate({ id: row.id, checkOut: new Date().toISOString() }); }}
            leftIcon={<LogOut className="h-3 w-3" />}
          >
            Registrar Saída
          </Button>
        ),
    },
    {
      key: 'minutesWorked', header: 'Horas', width: '90px', align: 'right',
      cell: (row) => <span className="text-sm tabular-nums font-medium">{formatMinutes(row.minutesWorked)}</span>,
    },
    {
      key: 'type', header: 'Tipo', width: '100px',
      cell: (row) => <Badge variant={typeConfig[row.type]?.variant} size="sm">{typeConfig[row.type]?.label}</Badge>,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Controle de Ponto</h2>
          <p className="text-sm text-[var(--text-muted)]">{pagination?.total ?? 0} registros</p>
        </div>
        <Button size="sm" leftIcon={<LogIn className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
          Registrar Entrada
        </Button>
      </div>

      <DataTable
        columns={columns} data={records} loading={isLoading}
        pagination={pagination} onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        rowKey="id"
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">⏱️</div>
            <p className="text-sm font-medium text-[var(--text)]">Nenhum registro de ponto</p>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="mt-4" onClick={() => setModalOpen(true)}>
              Registrar Entrada
            </Button>
          </div>
        }
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Ponto" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Colaborador</label>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} className={fc}>
              <option value="">— Selecione —</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Data/Hora de Entrada</label>
            <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={fc}>
              <option value="regular">Regular</option>
              <option value="overtime">Hora Extra</option>
              <option value="absence">Falta</option>
              <option value="vacation">Férias</option>
              <option value="holiday">Feriado</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" loading={createMutation.isPending} onClick={handleCreate} disabled={!empId || !checkIn}>
              Registrar
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
