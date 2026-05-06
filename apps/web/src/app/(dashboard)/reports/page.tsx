'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { useReportExecutions, downloadReport } from '@/hooks/use-reports';
import { ReportModal } from '@/components/modules/reports/report-modal';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ReportExecution } from '@/lib/api/reports.api';

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  pending:    { label: 'Aguardando',   variant: 'default',  icon: Clock        },
  processing: { label: 'Processando',  variant: 'warning',  icon: Loader2      },
  completed:  { label: 'Concluído',    variant: 'success',  icon: CheckCircle2 },
  failed:     { label: 'Erro',         variant: 'danger',   icon: XCircle      },
};

const moduleLabel: Record<string, string> = {
  sales: 'Vendas', finance: 'Financeiro', inventory: 'Estoque', hr: 'RH', general: 'Geral',
};

const formatLabel: Record<string, string> = {
  csv: 'CSV', xlsx: 'Excel', pdf: 'PDF',
};

export default function ReportsPage() {
  const [page, setPage]   = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useReportExecutions(page);
  const executions = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  const columns: Column<ReportExecution>[] = [
    {
      key: 'template',
      header: 'Relatório',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-[var(--text)]">{row.template?.name ?? '—'}</p>
          <p className="text-xs text-[var(--text-muted)]">{moduleLabel[row.template?.module ?? ''] ?? row.template?.module}</p>
        </div>
      ),
    },
    {
      key: 'format',
      header: 'Formato',
      width: '90px',
      cell: (row) => <Badge variant="default" size="sm">{formatLabel[row.format] ?? row.format}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      cell: (row) => {
        const cfg = statusConfig[row.status];
        const Icon = cfg?.icon;
        return (
          <Badge variant={cfg?.variant} size="sm">
            {row.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {cfg?.label}
          </Badge>
        );
      },
    },
    {
      key: 'rowCount',
      header: 'Registros',
      width: '100px',
      align: 'right',
      cell: (row) => (
        <span className="text-sm tabular-nums text-[var(--text-muted)]">
          {row.rowCount != null ? row.rowCount.toLocaleString('pt-BR') : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Gerado em',
      width: '150px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {new Date(row.createdAt).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'actions' as any,
      header: '',
      width: '80px',
      align: 'right',
      cell: (row) =>
        row.status === 'completed' && row.fileUrl ? (
          <Button
            variant="ghost"
            size="xs"
            leftIcon={<FileDown className="h-3 w-3" />}
            onClick={(e) => {
              e.stopPropagation();
              // fileUrl is stored as data URL — extract base64 part
              const [meta, b64] = row.fileUrl!.split(',');
              const mime = meta.replace('data:', '').replace(';base64', '');
              const ext  = row.format;
              downloadReport(b64, `${row.template?.name ?? 'relatorio'}.${ext}`, mime);
            }}
          >
            Baixar
          </Button>
        ) : row.status === 'failed' ? (
          <span className="text-xs text-danger" title={row.errorMessage}>Erro</span>
        ) : null,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Relatórios</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Histórico de relatórios gerados · {pagination?.total ?? 0} execuções
          </p>
        </div>
        <Button
          size="sm"
          leftIcon={<FileDown className="h-4 w-4" />}
          onClick={() => setModalOpen(true)}
        >
          Gerar Relatório
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={executions}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        rowKey="id"
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm font-medium text-[var(--text)]">Nenhum relatório gerado ainda</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
              Use o botão "Gerar Relatório" em qualquer módulo
            </p>
            <Button size="sm" leftIcon={<FileDown className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Gerar Relatório
            </Button>
          </div>
        }
      />

      <ReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </motion.div>
  );
}
