'use client';

import { useState, useEffect } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReportTemplates, useGenerateReport, downloadReport } from '@/hooks/use-reports';
import type { ReportModule, ExportFormat, ReportTemplate } from '@/lib/api/reports.api';

interface Props {
  open:         boolean;
  onClose:      () => void;
  defaultModule?: ReportModule;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string }[] = [
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: '📊' },
  { value: 'csv',  label: 'CSV (.csv)',    icon: '📄' },
  { value: 'pdf',  label: 'PDF (.pdf)',    icon: '📋' },
];

const fc = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

export function ReportModal({ open, onClose, defaultModule }: Props) {
  const { data: templates = [], isLoading: loadingTemplates } = useReportTemplates(defaultModule);
  const generate = useGenerateReport();

  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [format,     setFormat]     = useState<ExportFormat>('xlsx');
  const [parameters, setParameters] = useState<Record<string, any>>({});

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTemplate(null);
      setFormat('xlsx');
      setParameters({});
    }
  }, [open]);

  // Auto-select first template when list loads
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates, selectedTemplate]);

  const handleTemplateChange = (id: string) => {
    const tpl = templates.find((t) => t.id === id) ?? null;
    setSelectedTemplate(tpl);
    setParameters({});
  };

  const setParam = (key: string, value: string) =>
    setParameters((prev) => ({ ...prev, [key]: value || undefined }));

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    const result = await generate.mutateAsync({
      templateId: selectedTemplate.id,
      format,
      parameters,
    });
    // Se foi enfileirado (Redis disponível), apenas fecha o modal
    // Se executou inline, faz download imediato
    if (!result.queued && result.buffer && result.fileName && result.mimeType) {
      downloadReport(result.buffer, result.fileName, result.mimeType);
    }
    onClose();
  };

  const moduleLabel: Record<string, string> = {
    sales: 'Vendas', finance: 'Financeiro', inventory: 'Estoque', hr: 'RH', general: 'Geral',
  };

  // Group templates by module for the select
  const grouped = templates.reduce<Record<string, ReportTemplate[]>>((acc, t) => {
    (acc[t.module] ??= []).push(t);
    return acc;
  }, {});

  return (
    <Modal open={open} onClose={onClose} title="Gerar Relatório" size="lg">
      <div className="space-y-5">
        {/* Template selector */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Modelo de Relatório <span className="text-danger">*</span>
          </label>
          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos...
            </div>
          ) : (
            <select
              value={selectedTemplate?.id ?? ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className={fc}
            >
              <option value="">— Selecione um modelo —</option>
              {Object.entries(grouped).map(([mod, tpls]) => (
                <optgroup key={mod} label={moduleLabel[mod] ?? mod}>
                  {tpls.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {selectedTemplate?.description && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5">{selectedTemplate.description}</p>
          )}
        </div>

        {/* Dynamic filters */}
        {selectedTemplate && selectedTemplate.filters.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
              Filtros
            </p>
            <div className="space-y-3">
              {selectedTemplate.filters.map((filter) => (
                <div key={filter.key}>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    {filter.label}
                    {filter.required && <span className="text-danger ml-1">*</span>}
                  </label>

                  {filter.type === 'select' ? (
                    <select
                      value={parameters[filter.key] ?? ''}
                      onChange={(e) => setParam(filter.key, e.target.value)}
                      className={fc}
                    >
                      <option value="">— Todos —</option>
                      {filter.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : filter.type === 'date' ? (
                    <Input
                      type="date"
                      value={parameters[filter.key] ?? ''}
                      onChange={(e) => setParam(filter.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      type="text"
                      placeholder={`Filtrar por ${filter.label.toLowerCase()}...`}
                      value={parameters[filter.key] ?? ''}
                      onChange={(e) => setParam(filter.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Format selector */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Formato de Exportação
          </p>
          <div className="grid grid-cols-3 gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  format === f.value
                    ? 'border-primary-500 bg-primary-500/10 text-primary-600'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-primary-500/40'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview info */}
        {selectedTemplate && (
          <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text)]">{selectedTemplate.columns.length}</span> colunas
              {' · '}
              <span className="font-semibold text-[var(--text)]">{selectedTemplate.filters.length}</span> filtros disponíveis
              {' · '}
              Exportando como <span className="font-semibold text-[var(--text)]">{format.toUpperCase()}</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={onClose} disabled={generate.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            loading={generate.isPending}
            disabled={!selectedTemplate}
            leftIcon={<FileDown className="h-4 w-4" />}
          >
            Gerar e Baixar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
