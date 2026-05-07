'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Users, TrendingUp, DollarSign, Target,
  MoreHorizontal, Mail, Phone, Building2, ArrowRight,
} from 'lucide-react';
import { useCrmKanban, useCrmSummary, useMoveLead, useDeleteLead } from '@/hooks/use-crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/modal';
import { LeadModal } from '@/components/modules/crm/lead-modal';
import type { Lead, LeadStage } from '@/lib/api/crm.api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Config ───────────────────────────────────────────────────────────────────

const STAGES: { key: LeadStage; label: string; color: string; bg: string }[] = [
  { key: 'new',         label: 'Novo',        color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  { key: 'contacted',   label: 'Contato',     color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { key: 'proposal',    label: 'Proposta',    color: 'text-amber-500',  bg: 'bg-amber-500/10'  },
  { key: 'negotiation', label: 'Negociação',  color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { key: 'converted',   label: 'Convertido',  color: 'text-green-500',  bg: 'bg-green-500/10'  },
];

function fmt(v?: number) {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onMove,
}: {
  lead: Lead;
  onEdit: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  onMove: (l: Lead, stage: LeadStage) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const nextStageMap: Partial<Record<LeadStage, LeadStage>> = {
    new: 'contacted', contacted: 'proposal', proposal: 'negotiation', negotiation: 'converted',
  };
  const nextStage = nextStageMap[lead.stage];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/crm/${lead.id}`} className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text)] truncate hover:text-primary-500 transition-colors">
            {lead.name}
          </p>
          {lead.company && (
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.company}</span>
            </p>
          )}
        </Link>

        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-all"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1">
                <button
                  onClick={() => { onEdit(lead); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-2)]"
                >
                  Editar
                </button>
                {nextStage && (
                  <button
                    onClick={() => { onMove(lead, nextStage); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    Avançar →
                  </button>
                )}
                <Link
                  href={`/crm/${lead.id}`}
                  className="block px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-2)]"
                  onClick={() => setMenuOpen(false)}
                >
                  Ver detalhes
                </Link>
                {lead.stage !== 'converted' && (
                  <button
                    onClick={() => { onDelete(lead); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contacts */}
      <div className="space-y-0.5 mb-2">
        {lead.email && (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0" />{lead.email}
          </p>
        )}
        {lead.phone && (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />{lead.phone}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        {lead.estimatedValue ? (
          <span className="text-xs font-semibold text-green-500">{fmt(lead.estimatedValue)}</span>
        ) : (
          <span className="text-xs text-[var(--text-subtle)]">Sem valor</span>
        )}
        {lead.probability > 0 && (
          <span className="text-xs text-[var(--text-muted)]">{lead.probability}%</span>
        )}
      </div>

      {/* Converted badge */}
      {lead.stage === 'converted' && (
        <div className="absolute top-2 right-2">
          <Badge variant="success" size="sm">✓ Convertido</Badge>
        </div>
      )}

      {/* Quick advance button */}
      {nextStage && (
        <button
          onClick={() => onMove(lead, nextStage)}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-primary-500/10 hover:bg-primary-500/20 text-primary-500"
          title={`Avançar para ${STAGES.find((s) => s.key === nextStage)?.label}`}
        >
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  onAdd,
  onEdit,
  onDelete,
  onMove,
}: {
  stage: typeof STAGES[number];
  leads: Lead[];
  onAdd: () => void;
  onEdit: (l: Lead) => void;
  onDelete: (l: Lead) => void;
  onMove: (l: Lead, s: LeadStage) => void;
}) {
  const totalValue = leads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);

  return (
    <div className="flex flex-col min-w-[260px] max-w-[280px] w-full">
      {/* Column header */}
      <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-lg', stage.bg)}>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold', stage.color)}>{stage.label}</span>
          <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', stage.bg, stage.color)}>
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-xs text-[var(--text-muted)]">{fmt(totalValue)}</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 rounded-b-lg border border-t-0 border-[var(--border)] bg-[var(--surface-2)] p-2 space-y-2 min-h-[120px]">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
        ))}

        {stage.key !== 'converted' && (
          <button
            onClick={onAdd}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors border border-dashed border-[var(--border)]"
          >
            <Plus className="h-3 w-3" /> Adicionar lead
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const { data: kanban, isLoading } = useCrmKanban();
  const { data: summary } = useCrmSummary();
  const moveMutation   = useMoveLead();
  const deleteMutation = useDeleteLead();

  const [modalOpen, setModalOpen]   = useState(false);
  const [editLead, setEditLead]     = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [defaultStage, setDefaultStage] = useState<LeadStage>('new');

  const handleAdd = useCallback((stage: LeadStage) => {
    setDefaultStage(stage);
    setEditLead(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((lead: Lead) => {
    setEditLead(lead);
    setModalOpen(true);
  }, []);

  const handleMove = useCallback((lead: Lead, stage: LeadStage) => {
    moveMutation.mutate({ id: lead.id, stage });
  }, [moveMutation]);

  const handleDelete = async () => {
    if (!deleteLead) return;
    await deleteMutation.mutateAsync(deleteLead.id);
    setDeleteLead(null);
  };

  const stats = [
    { label: 'Total de Leads',   value: summary?.total ?? 0,                          icon: Users,      color: 'text-blue-500'   },
    { label: 'Pipeline',         value: fmt(summary?.pipelineValue),                  icon: DollarSign, color: 'text-green-500'  },
    { label: 'Em Negociação',    value: summary?.byStage?.negotiation?.count ?? 0,    icon: TrendingUp, color: 'text-orange-500' },
    { label: 'Convertidos',      value: summary?.byStage?.converted?.count ?? 0,      icon: Target,     color: 'text-purple-500' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">CRM — Pipeline</h2>
          <p className="text-sm text-[var(--text-muted)]">Gerencie seus leads e oportunidades comerciais</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => handleAdd('new')}>
          Novo Lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-[var(--text)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max h-full">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={(kanban as any)?.[stage.key] ?? []}
                onAdd={() => handleAdd(stage.key)}
                onEdit={handleEdit}
                onDelete={setDeleteLead}
                onMove={handleMove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <LeadModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditLead(null); }}
        lead={editLead ?? (defaultStage !== 'new' ? { stage: defaultStage } as any : null)}
      />

      <ConfirmModal
        open={!!deleteLead}
        onClose={() => setDeleteLead(null)}
        onConfirm={handleDelete}
        title="Excluir lead"
        description={`Deseja excluir "${deleteLead?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteMutation.isPending}
      />
    </motion.div>
  );
}
