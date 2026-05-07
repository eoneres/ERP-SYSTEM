'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, DollarSign,
  Plus, Trash2, CheckCircle2, FileText, MessageSquare,
} from 'lucide-react';
import {
  useLead, useQuotes, useInteractions,
  useConvertLead, useDeleteQuote, useDeleteInteraction,
} from '@/hooks/use-crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/modal';
import { LeadModal } from '@/components/modules/crm/lead-modal';
import { QuoteModal } from '@/components/modules/crm/quote-modal';
import { InteractionModal } from '@/components/modules/crm/interaction-modal';
import type { Lead, Quote, Interaction } from '@/lib/api/crm.api';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  new: 'Novo', contacted: 'Contato', proposal: 'Proposta',
  negotiation: 'Negociação', converted: 'Convertido', lost: 'Perdido',
};
const STAGE_VARIANTS: Record<string, any> = {
  new: 'default', contacted: 'primary', proposal: 'warning',
  negotiation: 'warning', converted: 'success', lost: 'danger',
};
const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', sent: 'Enviada', accepted: 'Aceita', rejected: 'Recusada', expired: 'Expirada',
};
const QUOTE_STATUS_VARIANTS: Record<string, any> = {
  draft: 'default', sent: 'primary', accepted: 'success', rejected: 'danger', expired: 'default',
};
const INTERACTION_ICONS: Record<string, string> = {
  call: '📞', email: '✉️', meeting: '🤝', note: '📝', task: '✅', other: '💬',
};

function fmt(v?: number) {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: lead, isLoading } = useLead(id);
  const { data: quotes = [] }     = useQuotes(id);
  const { data: interactions = [] } = useInteractions(id);

  const convertMutation      = useConvertLead();
  const deleteQuoteMutation  = useDeleteQuote();
  const deleteInterMutation  = useDeleteInteraction();

  const [editOpen,        setEditOpen]        = useState(false);
  const [quoteOpen,       setQuoteOpen]       = useState(false);
  const [editQuote,       setEditQuote]       = useState<Quote | null>(null);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [convertOpen,     setConvertOpen]     = useState(false);
  const [deleteQuote,     setDeleteQuote]     = useState<Quote | null>(null);
  const [deleteInter,     setDeleteInter]     = useState<Interaction | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!lead) return null;

  const l = lead as Lead;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-[var(--text)]">{l.name}</h2>
            <Badge variant={STAGE_VARIANTS[l.stage]} size="sm">{STAGE_LABELS[l.stage]}</Badge>
          </div>
          {l.company && (
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3.5 w-3.5" />{l.company}
              {l.position && <span>· {l.position}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {l.stage !== 'converted' && l.stage !== 'lost' && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
              onClick={() => setConvertOpen(true)}
            >
              Converter em Cliente
            </Button>
          )}
          <Button size="sm" onClick={() => setEditOpen(true)}>Editar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Contato</p>
            {l.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                <a href={`mailto:${l.email}`} className="text-primary-500 hover:underline truncate">{l.email}</a>
              </div>
            )}
            {l.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                <span className="text-[var(--text)]">{l.phone}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Negócio</p>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
              <span className="text-[var(--text)]">{fmt(l.estimatedValue)}</span>
            </div>
            {l.probability > 0 && (
              <div>
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span>Probabilidade</span><span>{l.probability}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${l.probability}%` }}
                  />
                </div>
              </div>
            )}
            {l.expectedCloseDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                <span className="text-[var(--text)]">Previsão: {fmtDate(l.expectedCloseDate)}</span>
              </div>
            )}
          </div>

          {l.notes && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Observações</p>
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{l.notes}</p>
            </div>
          )}

          {l.convertedCustomerId && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <p className="text-xs font-semibold text-green-500 mb-1">✓ Convertido em cliente</p>
              <p className="text-xs text-[var(--text-muted)]">em {fmtDate(l.convertedAt)}</p>
            </div>
          )}
        </div>

        {/* Right — Quotes + Interactions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quotes */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--text-muted)]" /> Propostas ({(quotes as Quote[]).length})
              </p>
              {l.stage !== 'converted' && (
                <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => { setEditQuote(null); setQuoteOpen(true); }}>
                  Nova
                </Button>
              )}
            </div>
            {(quotes as Quote[]).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhuma proposta ainda</p>
            ) : (
              <div className="space-y-2">
                {(quotes as Quote[]).map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{q.quoteNumber}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {fmt(q.amount - q.discount)} · válida até {fmtDate(q.validUntil)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={QUOTE_STATUS_VARIANTS[q.status]} size="sm">
                        {QUOTE_STATUS_LABELS[q.status]}
                      </Badge>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteQuote(q)}>
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactions */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[var(--text-muted)]" /> Histórico ({(interactions as Interaction[]).length})
              </p>
              <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setInteractionOpen(true)}>
                Registrar
              </Button>
            </div>
            {(interactions as Interaction[]).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhuma interação registrada</p>
            ) : (
              <div className="space-y-2">
                {(interactions as Interaction[]).map((i) => (
                  <div key={i.id} className="flex gap-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                    <span className="text-lg shrink-0">{INTERACTION_ICONS[i.type] ?? '💬'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{i.subject}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-[var(--text-muted)]">{fmtDate(i.interactionDate)}</span>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteInter(i)}>
                            <Trash2 className="h-3 w-3 text-danger" />
                          </Button>
                        </div>
                      </div>
                      {i.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{i.description}</p>
                      )}
                      {i.nextActionDate && (
                        <p className="text-xs text-amber-500 mt-1">
                          📅 Próxima ação: {fmtDate(i.nextActionDate)}
                          {i.nextActionNote && ` — ${i.nextActionNote}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LeadModal open={editOpen} onClose={() => setEditOpen(false)} lead={l} />

      <QuoteModal
        open={quoteOpen}
        onClose={() => { setQuoteOpen(false); setEditQuote(null); }}
        leadId={id}
        quote={editQuote}
      />

      <InteractionModal open={interactionOpen} onClose={() => setInteractionOpen(false)} leadId={id} />

      <ConfirmModal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        onConfirm={async () => {
          await convertMutation.mutateAsync({ id });
          setConvertOpen(false);
        }}
        title="Converter lead em cliente"
        description={`Deseja converter "${l.name}" em cliente? Um registro será criado automaticamente no módulo de Vendas.`}
        confirmLabel="Converter"
        variant="primary"
        loading={convertMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteQuote}
        onClose={() => setDeleteQuote(null)}
        onConfirm={async () => { await deleteQuoteMutation.mutateAsync(deleteQuote!.id); setDeleteQuote(null); }}
        title="Excluir proposta"
        description={`Excluir proposta ${deleteQuote?.quoteNumber}?`}
        confirmLabel="Excluir"
        loading={deleteQuoteMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteInter}
        onClose={() => setDeleteInter(null)}
        onConfirm={async () => { await deleteInterMutation.mutateAsync(deleteInter!.id); setDeleteInter(null); }}
        title="Excluir interação"
        description="Deseja excluir esta interação?"
        confirmLabel="Excluir"
        loading={deleteInterMutation.isPending}
      />
    </motion.div>
  );
}
