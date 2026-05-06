'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Palette, Settings2, ToggleLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  useTenantSettings, useUpdateCompany, useUpdateBranding,
  useUpdateSystemSettings, useUpdateFeatureFlags,
} from '@/hooks/use-settings';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const fc = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const TABS = [
  { id: 'company',  label: 'Empresa',       icon: Building2  },
  { id: 'branding', label: 'Branding',       icon: Palette    },
  { id: 'system',   label: 'Sistema',        icon: Settings2  },
  { id: 'features', label: 'Feature Flags',  icon: ToggleLeft },
] as const;

type TabId = typeof TABS[number]['id'];

const FEATURE_FLAGS_CATALOG = [
  { key: 'hr_enabled',           label: 'Módulo RH',                  desc: 'Habilita gestão de colaboradores, folha e ponto' },
  { key: 'reports_advanced',     label: 'Relatórios Avançados',        desc: 'Templates customizados e exportação em PDF' },
  { key: 'crm_enabled',          label: 'CRM',                        desc: 'Pipeline de leads e gestão de oportunidades' },
  { key: 'purchases_enabled',    label: 'Módulo Compras',              desc: 'Fornecedores e ordens de compra' },
  { key: 'fiscal_enabled',       label: 'Módulo Fiscal',               desc: 'Emissão de NF-e e documentos fiscais' },
  { key: 'multi_warehouse',      label: 'Múltiplos Depósitos',         desc: 'Gestão de estoque em múltiplos locais' },
  { key: 'notifications_email',  label: 'Notificações por E-mail',     desc: 'Envio de alertas e resumos por e-mail' },
];

const TIMEZONES = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Belem',
  'America/Fortaleza', 'America/Recife', 'America/Cuiaba',
  'America/Porto_Velho', 'America/Boa_Vista', 'America/Noronha',
  'UTC',
];

const CURRENCIES = [
  { value: 'BRL', label: 'Real Brasileiro (R$)' },
  { value: 'USD', label: 'Dólar Americano ($)'  },
  { value: 'EUR', label: 'Euro (€)'             },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA (padrão BR)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA (EUA)'       },
  { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD (ISO)'       },
];

// ─── Company Tab ──────────────────────────────────────────────────────────────
function CompanyTab({ tenant }: { tenant: any }) {
  const update = useUpdateCompany();
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<any>();

  useEffect(() => {
    if (tenant) reset({
      companyName:  tenant.companyName  ?? '',
      tradeName:    tenant.tradeName    ?? '',
      cnpj:         tenant.cnpj         ?? '',
      email:        tenant.email        ?? '',
      phone:        tenant.phone        ?? '',
      street:       tenant.address?.street       ?? '',
      number:       tenant.address?.number       ?? '',
      complement:   tenant.address?.complement   ?? '',
      neighborhood: tenant.address?.neighborhood ?? '',
      city:         tenant.address?.city         ?? '',
      state:        tenant.address?.state        ?? '',
      zipCode:      tenant.address?.zipCode      ?? '',
    });
  }, [tenant, reset]);

  const onSubmit = async (v: any) => {
    await update.mutateAsync({
      companyName: v.companyName, tradeName: v.tradeName,
      cnpj: v.cnpj, email: v.email, phone: v.phone,
      address: {
        street: v.street, number: v.number, complement: v.complement,
        neighborhood: v.neighborhood, city: v.city, state: v.state, zipCode: v.zipCode,
      },
    });
    reset(v);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Dados da Empresa</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Razão Social <span className="text-danger">*</span></label>
            <Input {...register('companyName', { required: true })} placeholder="Empresa Ltda." />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nome Fantasia</label>
            <Input {...register('tradeName')} placeholder="Nome Fantasia" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CNPJ</label>
            <Input {...register('cnpj')} placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">E-mail</label>
            <Input {...register('email')} type="email" placeholder="contato@empresa.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Telefone</label>
            <Input {...register('phone')} placeholder="(11) 3000-0000" />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Endereço</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Rua / Avenida</label>
            <Input {...register('street')} placeholder="Rua das Flores" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Número</label>
            <Input {...register('number')} placeholder="123" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Complemento</label>
            <Input {...register('complement')} placeholder="Sala 10" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Bairro</label>
            <Input {...register('neighborhood')} placeholder="Centro" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CEP</label>
            <Input {...register('zipCode')} placeholder="00000-000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cidade</label>
            <Input {...register('city')} placeholder="São Paulo" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">UF</label>
            <Input {...register('state')} placeholder="SP" maxLength={2} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-[var(--border)]">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" />}>
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────
function BrandingTab({ tenant }: { tenant: any }) {
  const update = useUpdateBranding();
  const { register, handleSubmit, watch, reset, formState: { isSubmitting, isDirty } } = useForm<any>();

  useEffect(() => {
    if (tenant) reset({
      primaryColor:   tenant.branding?.primaryColor   ?? '#1D4ED8',
      secondaryColor: tenant.branding?.secondaryColor ?? '#6D28D9',
      fontFamily:     tenant.branding?.fontFamily     ?? '',
      logoUrl:        tenant.logoUrl                  ?? '',
      faviconUrl:     tenant.faviconUrl               ?? '',
      customCss:      tenant.branding?.customCss      ?? '',
    });
  }, [tenant, reset]);

  const primary   = watch('primaryColor',   '#1D4ED8');
  const secondary = watch('secondaryColor', '#6D28D9');

  const onSubmit = async (v: any) => {
    await update.mutateAsync({
      primaryColor: v.primaryColor, secondaryColor: v.secondaryColor,
      fontFamily: v.fontFamily || undefined,
      logoUrl: v.logoUrl || undefined, faviconUrl: v.faviconUrl || undefined,
      customCss: v.customCss || undefined,
    });
    reset(v);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Color preview */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="h-10 w-10 rounded-lg shadow-sm" style={{ backgroundColor: primary }} />
        <div className="h-10 w-10 rounded-lg shadow-sm" style={{ backgroundColor: secondary }} />
        <div>
          <p className="text-sm font-medium text-[var(--text)]">Prévia das Cores</p>
          <p className="text-xs text-[var(--text-muted)]">Primária e Secundária</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cor Primária</label>
          <div className="flex items-center gap-2">
            <input {...register('primaryColor')} type="color" className="h-9 w-12 rounded border border-[var(--border)] cursor-pointer bg-transparent" />
            <Input {...register('primaryColor')} placeholder="#1D4ED8" className="font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cor Secundária</label>
          <div className="flex items-center gap-2">
            <input {...register('secondaryColor')} type="color" className="h-9 w-12 rounded border border-[var(--border)] cursor-pointer bg-transparent" />
            <Input {...register('secondaryColor')} placeholder="#6D28D9" className="font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Fonte</label>
          <Input {...register('fontFamily')} placeholder="Inter, sans-serif" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">URL do Logo</label>
          <Input {...register('logoUrl')} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">URL do Favicon</label>
          <Input {...register('faviconUrl')} placeholder="https://..." />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CSS Customizado</label>
        <textarea
          {...register('customCss')}
          rows={5}
          placeholder=":root { --primary: #1D4ED8; }"
          className={fc + ' resize-none font-mono text-xs'}
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-[var(--border)]">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" />}>
          Salvar Branding
        </Button>
      </div>
    </form>
  );
}

// ─── System Tab ───────────────────────────────────────────────────────────────
function SystemTab({ tenant }: { tenant: any }) {
  const update = useUpdateSystemSettings();
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<any>();

  useEffect(() => {
    if (tenant) reset({
      currency:   tenant.settings?.currency   ?? 'BRL',
      language:   tenant.settings?.language   ?? 'pt-BR',
      timezone:   tenant.settings?.timezone   ?? 'America/Sao_Paulo',
      dateFormat: tenant.settings?.dateFormat ?? 'DD/MM/YYYY',
    });
  }, [tenant, reset]);

  const onSubmit = async (v: any) => {
    await update.mutateAsync(v);
    reset(v);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Moeda</label>
          <select {...register('currency')} className={fc}>
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Idioma</label>
          <select {...register('language')} className={fc}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Fuso Horário</label>
          <select {...register('timezone')} className={fc}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Formato de Data</label>
          <select {...register('dateFormat')} className={fc}>
            {DATE_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Plan info */}
      <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Plano Atual</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {tenant?.trialEndsAt
                ? `Trial até ${new Date(tenant.trialEndsAt).toLocaleDateString('pt-BR')}`
                : 'Assinatura ativa'}
            </p>
          </div>
          <Badge variant="primary" size="sm">
            {tenant?.plan?.toUpperCase() ?? 'FREE'}
          </Badge>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-[var(--border)]">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" />}>
          Salvar Configurações
        </Button>
      </div>
    </form>
  );
}

// ─── Feature Flags Tab ────────────────────────────────────────────────────────
function FeatureFlagsTab({ tenant }: { tenant: any }) {
  const update = useUpdateFeatureFlags();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (tenant?.featureFlags) {
      setFlags(tenant.featureFlags);
      setDirty(false);
    }
  }, [tenant]);

  const toggle = (key: string) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const save = async () => {
    await update.mutateAsync(flags);
    setDirty(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Ative ou desative funcionalidades do sistema para este tenant.
      </p>

      <div className="space-y-2">
        {FEATURE_FLAGS_CATALOG.map((flag) => {
          const enabled = !!flags[flag.key];
          return (
            <div
              key={flag.key}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer',
                enabled
                  ? 'border-primary-500/40 bg-primary-500/5'
                  : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]',
              )}
              onClick={() => toggle(flag.key)}
            >
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{flag.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{flag.desc}</p>
              </div>
              <div className={cn(
                'relative h-6 w-11 rounded-full transition-colors shrink-0',
                enabled ? 'bg-primary-500' : 'bg-[var(--surface-3)]',
              )}>
                <div className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2 border-t border-[var(--border)]">
        <Button
          onClick={save}
          loading={update.isPending}
          disabled={!dirty}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Salvar Feature Flags
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsCompanyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('company');
  const { data: tenant, isLoading } = useTenantSettings();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-[var(--text)]">Configurações</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Gerencie os dados, branding e preferências da sua empresa
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center',
                activeTab === tab.id
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <Card>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <>
            {activeTab === 'company'  && <CompanyTab      tenant={tenant} />}
            {activeTab === 'branding' && <BrandingTab     tenant={tenant} />}
            {activeTab === 'system'   && <SystemTab       tenant={tenant} />}
            {activeTab === 'features' && <FeatureFlagsTab tenant={tenant} />}
          </>
        )}
      </Card>
    </motion.div>
  );
}
