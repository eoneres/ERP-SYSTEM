'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useSystemUsers, useUpdatePermissions } from '@/hooks/use-hr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemUser } from '@/lib/api/hr.api';

const ALL_PERMISSIONS = [
  { key: 'finance:manage',  label: 'Financeiro — Gerenciar',  module: 'Financeiro' },
  { key: 'finance:view',    label: 'Financeiro — Visualizar', module: 'Financeiro' },
  { key: 'inventory:manage',label: 'Estoque — Gerenciar',     module: 'Estoque'    },
  { key: 'inventory:view',  label: 'Estoque — Visualizar',    module: 'Estoque'    },
  { key: 'sales:manage',    label: 'Vendas — Gerenciar',      module: 'Vendas'     },
  { key: 'sales:view',      label: 'Vendas — Visualizar',     module: 'Vendas'     },
  { key: 'hr:manage',       label: 'RH — Gerenciar',          module: 'RH'         },
  { key: 'hr:view',         label: 'RH — Visualizar',         module: 'RH'         },
  { key: 'reports:view',    label: 'Relatórios',              module: 'Relatórios' },
  { key: 'users:manage',    label: 'Usuários',                module: 'Sistema'    },
  { key: 'settings:manage', label: 'Configurações',           module: 'Sistema'    },
];

export default function PermissionsPage() {
  const { data, isLoading } = useSystemUsers({ limit: 100 });
  const users = (data as any)?.data ?? [] as SystemUser[];
  const updateMutation = useUpdatePermissions();

  // Local state: userId → permissions[]
  const [localPerms, setLocalPerms] = useState<Record<string, string[]>>({});

  const getPerms = (user: SystemUser) =>
    localPerms[user.id] ?? user.permissions ?? [];

  const toggle = (userId: string, perm: string, currentPerms: string[]) => {
    const next = currentPerms.includes(perm)
      ? currentPerms.filter((p) => p !== perm)
      : [...currentPerms, perm];
    setLocalPerms((prev) => ({ ...prev, [userId]: next }));
  };

  const save = async (user: SystemUser) => {
    const perms = getPerms(user);
    await updateMutation.mutateAsync({ id: user.id, permissions: perms });
    setLocalPerms((prev) => { const n = { ...prev }; delete n[user.id]; return n; });
  };

  const isDirty = (user: SystemUser) => !!localPerms[user.id];

  if (isLoading) return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text)]">Matriz de Permissões</h2>
        <p className="text-sm text-[var(--text-muted)]">Gerencie as permissões de cada usuário por módulo</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide sticky left-0 bg-[var(--surface-2)] min-w-[180px]">
                Usuário
              </th>
              {ALL_PERMISSIONS.map((p) => (
                <th key={p.key} className="px-3 py-3 text-center text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide min-w-[90px]">
                  <span className="block text-[9px] text-[var(--text-subtle)]">{p.module}</span>
                  {p.label.split(' — ')[1] ?? p.label}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide min-w-[80px]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: SystemUser) => {
              const perms = getPerms(user);
              const isAll = perms.includes('*');
              return (
                <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-[var(--surface)] hover:bg-[var(--surface-2)]">
                    <p className="text-sm font-medium text-[var(--text)]">{user.firstName} {user.lastName}</p>
                    <Badge variant="default" size="sm">{user.role}</Badge>
                  </td>
                  {ALL_PERMISSIONS.map((p) => (
                    <td key={p.key} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isAll || perms.includes(p.key)}
                        disabled={isAll}
                        onChange={() => toggle(user.id, p.key, perms)}
                        className="rounded border-[var(--border)] text-primary-500 focus:ring-primary-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    {isDirty(user) ? (
                      <Button
                        size="xs" variant="primary"
                        loading={updateMutation.isPending}
                        onClick={() => save(user)}
                        leftIcon={<Save className="h-3 w-3" />}
                      >
                        Salvar
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--text-subtle)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
