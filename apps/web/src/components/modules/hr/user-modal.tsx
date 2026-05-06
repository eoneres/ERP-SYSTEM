'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateSystemUser, useUpdateSystemUser, useEmployees } from '@/hooks/use-hr';
import type { SystemUser } from '@/lib/api/hr.api';

interface Props { open: boolean; onClose: () => void; user?: SystemUser | null; }

const fc = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const ROLES = [
  { value: 'tenant_admin', label: 'Administrador' },
  { value: 'manager',      label: 'Gerente'        },
  { value: 'employee',     label: 'Colaborador'    },
  { value: 'viewer',       label: 'Visualizador'   },
];

const ALL_PERMISSIONS = [
  { key: 'finance:manage',   label: 'Gerenciar',   module: 'Financeiro'  },
  { key: 'finance:view',     label: 'Visualizar',  module: 'Financeiro'  },
  { key: 'inventory:manage', label: 'Gerenciar',   module: 'Estoque'     },
  { key: 'inventory:view',   label: 'Visualizar',  module: 'Estoque'     },
  { key: 'sales:manage',     label: 'Gerenciar',   module: 'Vendas'      },
  { key: 'sales:view',       label: 'Visualizar',  module: 'Vendas'      },
  { key: 'hr:manage',        label: 'Gerenciar',   module: 'RH'          },
  { key: 'hr:view',          label: 'Visualizar',  module: 'RH'          },
  { key: 'reports:view',     label: 'Visualizar',  module: 'Relatórios'  },
  { key: 'users:manage',     label: 'Gerenciar',   module: 'Usuários'    },
  { key: 'settings:manage',  label: 'Configurar',  module: 'Sistema'     },
];

const MODULES = [...new Set(ALL_PERMISSIONS.map((p) => p.module))];

// Inner form — remontado via key quando user muda
function UserForm({ user, onClose }: { user: SystemUser | null | undefined; onClose: () => void }) {
  const isEdit = !!user;
  const create = useCreateSystemUser();
  const update = useUpdateSystemUser();

  const { data: empData } = useEmployees({ limit: 500, status: 'active' });
  const employees = (empData as any)?.data ?? [];

  const [selectedPerms, setSelectedPerms] = useState<string[]>(user?.permissions ?? []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    defaultValues: {
      firstName:  user?.firstName ?? '',
      lastName:   user?.lastName  ?? '',
      email:      user?.email     ?? '',
      password:   '',
      role:       user?.role      ?? 'employee',
      employeeId: (user as any)?.employeeId ?? '',
    },
  });

  const togglePerm = (key: string) =>
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );

  const onSubmit = async (v: any) => {
    const payload = {
      firstName:   v.firstName.trim(),
      lastName:    v.lastName.trim(),
      email:       v.email.trim(),
      role:        v.role,
      employeeId:  v.employeeId || undefined,
      permissions: selectedPerms,
      ...(!isEdit && { password: v.password }),
    };
    if (isEdit) await update.mutateAsync({ id: user!.id, data: payload });
    else        await create.mutateAsync(payload);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Nome */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Nome <span className="text-danger">*</span>
          </label>
          <Input {...register('firstName', { required: true })} placeholder="Nome"
            error={errors.firstName ? 'Obrigatório' : undefined} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Sobrenome <span className="text-danger">*</span>
          </label>
          <Input {...register('lastName', { required: true })} placeholder="Sobrenome"
            error={errors.lastName ? 'Obrigatório' : undefined} />
        </div>
      </div>

      {/* E-mail + Senha */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            E-mail <span className="text-danger">*</span>
          </label>
          <Input
            {...register('email', { required: true })}
            type="email"
            placeholder="usuario@empresa.com"
            disabled={isEdit}
          />
        </div>
        {!isEdit && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Senha <span className="text-danger">*</span>
            </label>
            <Input
              {...register('password', { required: !isEdit })}
              type="password"
              placeholder="Mínimo 8 caracteres"
              error={errors.password ? 'Obrigatório' : undefined}
            />
          </div>
        )}
      </div>

      {/* Role + Colaborador vinculado */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Perfil (Role)</label>
          <select {...register('role')} className={fc}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Vincular a Colaborador
          </label>
          <select {...register('employeeId')} className={fc}>
            <option value="">— Nenhum —</option>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>{e.fullName} — {e.position}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissões */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          Permissões
        </p>
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  Módulo
                </th>
                {['Gerenciar', 'Visualizar', 'Configurar'].map((a) => (
                  <th key={a} className="px-3 py-2 text-center font-semibold text-[var(--text-muted)] uppercase tracking-wide w-24">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => {
                const perms = ALL_PERMISSIONS.filter((p) => p.module === mod);
                return (
                  <tr key={mod} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-3 py-2.5 font-medium text-[var(--text)]">{mod}</td>
                    {['Gerenciar', 'Visualizar', 'Configurar'].map((action) => {
                      const perm = perms.find((p) => p.label === action);
                      return (
                        <td key={action} className="px-3 py-2.5 text-center">
                          {perm ? (
                            <input
                              type="checkbox"
                              checked={selectedPerms.includes(perm.key)}
                              onChange={() => togglePerm(perm.key)}
                              className="rounded border-[var(--border)] text-primary-500 focus:ring-primary-500 cursor-pointer"
                            />
                          ) : (
                            <span className="text-[var(--text-subtle)]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Salvar Alterações' : 'Criar Usuário'}
        </Button>
      </div>
    </form>
  );
}

export function UserModal({ open, onClose, user }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Editar — ${user.firstName} ${user.lastName}` : 'Novo Usuário do Sistema'}
      size="xl"
    >
      {/* key força remontagem do form quando o user muda, garantindo defaultValues corretos */}
      <UserForm key={user?.id ?? 'new'} user={user} onClose={onClose} />
    </Modal>
  );
}
