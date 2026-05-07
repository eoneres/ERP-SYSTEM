'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Plus, FileText, Download, XCircle, Settings2, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  useFiscalDocuments, useFiscalSeries,
  useCreateSeries, useUpdateSeries, useDeleteSeries,
  useCancelDocument,
} from '@/hooks/use-fiscal';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal, ConfirmModal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { FiscalDocumentModal } from '@/components/modules/fiscal/fiscal-document-modal';
import type { FiscalDocument, InvoiceSeries } from '@/lib/api/fiscal.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', pending: 'Pendente', authorized: 'Autorizado',
  cancelled: 'Cancelado', rejected: 'Rejeitado',
};
const STATUS_VARIANTS: Record<string, any> = {
  draft: 'default', pending: 'warning', authorized: 'success',
  cancelled: 'default', rejected: 'danger',
};
const DOC_TYPE_LABELS: Record<string, string> = {
  nfe: 'NF-e', nfce: 'NFC-e', nfse: 'NFS-e', other: 'Outro',
};
const fieldClass = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function downloadXml(doc: FiscalDocument) {
  if (!doc.xmlContent) return;
  const blob = new Blob([doc.xmlContent], { type: 'application/xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${DOC_TYPE_LABELS[doc.documentType]}_${doc.number}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Series Form Modal (criar ou editar) ──────────────────────────────────────

interface SeriesFormValues {
  series: string; documentType: string; description: string;
}

function SeriesFormModal({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: InvoiceSeries | null;
}) {
  const create = useCreateSeries();
  const update = useUpdateSeries();
  const isEdit = !!editing;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<SeriesFormValues>();

  // Preenche o form ao abrir
  useState(() => {
    if (open) {
      reset({
        series:       editing?.series       ?? '',
        documentType: editing?.documentType ?? 'nfe',
        description:  editing?.description  ?? '',
      });
    }
  });

  // Reset sempre que o modal abre
  const handleOpen = (node: HTMLFormElement | null) => {
    if (node && open) {
      reset({
        series:       editing?.series       ?? '',
        documentType: editing?.documentType ?? 'nfe',
        description:  editing?.description  ?? '',
      });
    }
  };

  const onSubmit = async (v: SeriesFormValues) => {
    const payload = {
      series:       v.series.trim(),
      documentType: v.documentType,
      description:  v.description.trim() || undefined,
    };
    if (isEdit) {
      await update.mutateAsync({ id: editing!.id, data: payload });
    } else {
      await create.mutateAsync(payload as any);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Série Fiscal' : 'Nova Série Fiscal'}
      size="sm"
    >
      <form ref={handleOpen} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Série <span className="text-danger">*</span>
            </label>
            <Input
              {...register('series', { required: 'Obrigatório' })}
              placeholder="A, 001..."
              disabled={isEdit} // série não pode ser alterada após criação
              error={errors.series?.message}
            />
            {isEdit && (
              <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                O código da série não pode ser alterado após a criação.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Tipo</label>
            <select {...register('documentType')} className={fieldClass} disabled={isEdit}>
              <option value="nfe">NF-e</option>
              <option value="nfce">NFC-e</option>
              <option value="nfse">NFS-e</option>
              <option value="other">Outro</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Descrição</label>
          <Input {...register('description')} placeholder="Opcional" />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Salvar Alterações' : 'Criar Série'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Series Manager Modal ─────────────────────────────────────────────────────

function SeriesManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: seriesList = [] } = useFiscalSeries();
  const updateMutation = useUpdateSeries();
  const deleteMutation = useDeleteSeries();

  const [formOpen,    setFormOpen]    = useState(false);
  const [editSeries,  setEditSeries]  = useState<InvoiceSeries | null>(null);
  const [deleteSeries, setDeleteSeries] = useState<InvoiceSeries | null>(null);

  const series = seriesList as InvoiceSeries[];

  const handleToggleActive = (s: InvoiceSeries) => {
    updateMutation.mutate({ id: s.id, data: { isActive: !s.isActive } });
  };

  const handleEdit = (s: InvoiceSeries) => {
    setEditSeries(s);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditSeries(null);
    setFormOpen(true);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Gerenciar Séries Fiscais" size="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">
              {series.length} série{series.length !== 1 ? 's' : ''} cadastrada{series.length !== 1 ? 's' : ''}
            </p>
            <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={handleNew}>
              Nova Série
            </Button>
          </div>

          {series.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-8 w-8 text-[var(--text-subtle)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">Nenhuma série cadastrada</p>
              <Button size="sm" className="mt-3" onClick={handleNew}>Criar primeira série</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {series.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {DOC_TYPE_LABELS[s.documentType]} — Série {s.series}
                      </span>
                      <Badge variant={s.isActive ? 'success' : 'default'} size="sm" dot>
                        {s.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[var(--text-muted)]">
                        Último nº emitido: <strong>{s.lastNumber}</strong>
                      </span>
                      {s.description && (
                        <span className="text-xs text-[var(--text-subtle)] truncate">{s.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle ativo/inativo */}
                    <button
                      onClick={() => handleToggleActive(s)}
                      disabled={updateMutation.isPending}
                      title={s.isActive ? 'Desativar série' : 'Ativar série'}
                      className="p-1.5 rounded-md hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      {s.isActive
                        ? <ToggleRight className="h-4 w-4 text-success" />
                        : <ToggleLeft  className="h-4 w-4" />}
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => handleEdit(s)}
                      title="Editar série"
                      className="p-1.5 rounded-md hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* Excluir — só disponível se lastNumber === 0 */}
                    <button
                      onClick={() => setDeleteSeries(s)}
                      title={s.lastNumber > 0 ? 'Série com documentos emitidos — não pode ser excluída' : 'Excluir série'}
                      disabled={s.lastNumber > 0}
                      className="p-1.5 rounded-md hover:bg-danger/10 text-[var(--text-muted)] hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </Modal>

      {/* Form criar/editar */}
      <SeriesFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditSeries(null); }}
        editing={editSeries}
      />

      {/* Confirmar exclusão */}
      <ConfirmModal
        open={!!deleteSeries}
        onClose={() => setDeleteSeries(null)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleteSeries!.id);
          setDeleteSeries(null);
        }}
        title="Excluir série fiscal"
        description={`Excluir a série "${deleteSeries?.series}" (${DOC_TYPE_LABELS[deleteSeries?.documentType ?? 'nfe']})? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FiscalPage() {
  const [page, setPage]             = useState(1);
  const [issueOpen, setIssueOpen]   = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [cancelDoc, setCancelDoc]   = useState<FiscalDocument | null>(null);

  const filter = useMemo(() => ({ page, limit: 20 }), [page]);
  const { data, isLoading }       = useFiscalDocuments(filter);
  const { data: seriesList = [] } = useFiscalSeries();
  const cancelMutation            = useCancelDocument();

  const documents  = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;
  const series     = seriesList as InvoiceSeries[];
  const activeSeries = series.filter((s) => s.isActive);

  const columns: Column<FiscalDocument>[] = [
    {
      key: 'number',
      header: 'Documento',
      cell: (row) => (
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">
            {DOC_TYPE_LABELS[row.documentType]} {row.series?.series}/{String(row.number).padStart(9, '0')}
          </p>
          {row.orderId && <p className="text-xs text-[var(--text-muted)]">Pedido vinculado</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status]} size="sm">{STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      key: 'recipientName',
      header: 'Destinatário',
      cell: (row) => (
        <span className="text-sm text-[var(--text-muted)]">{row.recipientName ?? '—'}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Valor',
      width: '130px',
      align: 'right',
      cell: (row) => (
        <span className="text-sm font-semibold tabular-nums text-[var(--text)]">{fmt(row.totalAmount)}</span>
      ),
    },
    {
      key: 'issueDate',
      header: 'Emissão',
      width: '130px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">
          {new Date(row.issueDate).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'actions' as any,
      header: '',
      width: '100px',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {row.xmlContent && (
            <Button
              variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); downloadXml(row); }}
              title="Baixar XML"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {(row.status === 'draft' || row.status === 'pending') && (
            <Button
              variant="ghost" size="icon-sm"
              onClick={(e) => { e.stopPropagation(); setCancelDoc(row); }}
              title="Cancelar documento"
            >
              <XCircle className="h-3.5 w-3.5 text-danger" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Módulo Fiscal</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {pagination?.total ?? 0} documentos · {series.length} série{series.length !== 1 ? 's' : ''} ({activeSeries.length} ativa{activeSeries.length !== 1 ? 's' : ''})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline"
            leftIcon={<Settings2 className="h-4 w-4" />}
            onClick={() => setSeriesOpen(true)}
          >
            Gerenciar Séries
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIssueOpen(true)}
            disabled={activeSeries.length === 0}
            title={activeSeries.length === 0 ? 'Crie uma série ativa para emitir documentos' : undefined}
          >
            Emitir Documento
          </Button>
        </div>
      </div>

      {/* Series chips */}
      {series.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {series.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeriesOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs hover:border-primary-500/40 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="font-medium text-[var(--text)]">
                {DOC_TYPE_LABELS[s.documentType]} — Série {s.series}
              </span>
              <span className="text-[var(--text-muted)]">nº {s.lastNumber}</span>
              <Badge variant={s.isActive ? 'success' : 'default'} size="sm" dot>
                {s.isActive ? 'Ativa' : 'Inativa'}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Documents table */}
      <div className="[&_tr]:group">
        <DataTable
          columns={columns}
          data={documents}
          loading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey="id"
          emptyState={
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🧾</div>
              <p className="text-sm font-medium text-[var(--text)]">Nenhum documento fiscal emitido</p>
              {series.length === 0 ? (
                <>
                  <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Crie uma série fiscal para começar</p>
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setSeriesOpen(true)}>
                    Criar Série
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Clique em "Emitir Documento" para começar</p>
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIssueOpen(true)}>
                    Emitir Documento
                  </Button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Modals */}
      <FiscalDocumentModal open={issueOpen} onClose={() => setIssueOpen(false)} />
      <SeriesManagerModal  open={seriesOpen} onClose={() => setSeriesOpen(false)} />

      <ConfirmModal
        open={!!cancelDoc}
        onClose={() => setCancelDoc(null)}
        onConfirm={async () => { await cancelMutation.mutateAsync(cancelDoc!.id); setCancelDoc(null); }}
        title="Cancelar documento fiscal"
        description={`Cancelar ${DOC_TYPE_LABELS[cancelDoc?.documentType ?? 'nfe']} nº ${cancelDoc?.number}?`}
        confirmLabel="Cancelar Documento"
        loading={cancelMutation.isPending}
      />
    </motion.div>
  );
}
