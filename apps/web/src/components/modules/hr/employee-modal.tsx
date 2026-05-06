'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateEmployee, useUpdateEmployee, useDepartments } from '@/hooks/use-hr';
import type { Employee } from '@/lib/api/hr.api';

interface Props { open: boolean; onClose: () => void; employee?: Employee | null; }

const fc = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-colors';

const EMPLOYMENT_TYPES = [
  { value: 'clt',        label: 'CLT'        },
  { value: 'pj',         label: 'PJ'         },
  { value: 'intern',     label: 'Estágio'    },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'temporary',  label: 'Temporário' },
];

function toDateStr(v: any): string {
  if (!v) return '';
  return String(v).slice(0, 10);
}

// Inner form — remontado via key quando employee muda, garantindo defaultValues corretos
function EmployeeForm({ employee, onClose }: { employee: Employee | null | undefined; onClose: () => void }) {
  const isEdit = !!employee;
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const { data: departments = [] } = useDepartments();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({
    defaultValues: {
      fullName:       employee?.fullName       ?? '',
      document:       employee?.document       ?? '',
      birthDate:      toDateStr(employee?.birthDate),
      hireDate:       toDateStr(employee?.hireDate) || new Date().toISOString().slice(0, 10),
      position:       employee?.position       ?? '',
      department:     employee?.department     ?? '',
      employmentType: employee?.employmentType ?? 'clt',
      salary:         employee?.salary         != null ? String(employee.salary) : '',
      email:          employee?.email          ?? '',
      phone:          employee?.phone          ?? '',
      address:        employee?.address        ?? '',
      city:           employee?.city           ?? '',
      state:          employee?.state          ?? '',
      status:         employee?.status         ?? 'active',
      notes:          employee?.notes          ?? '',
    },
  });

  const onSubmit = async (v: any) => {
    const payload = {
      fullName:       v.fullName.trim(),
      document:       v.document.trim()   || undefined,
      birthDate:      v.birthDate         || undefined,
      hireDate:       v.hireDate,
      position:       v.position.trim(),
      department:     v.department.trim() || undefined,
      employmentType: v.employmentType,
      salary:         parseFloat(v.salary) || 0,
      email:          v.email.trim()      || undefined,
      phone:          v.phone.trim()      || undefined,
      address:        v.address.trim()    || undefined,
      city:           v.city.trim()       || undefined,
      state:          v.state.trim()      || undefined,
      notes:          v.notes.trim()      || undefined,
      ...(isEdit && { status: v.status }),
    };
    if (isEdit) await update.mutateAsync({ id: employee!.id, data: payload });
    else        await create.mutateAsync(payload as any);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Nome Completo <span className="text-danger">*</span>
          </label>
          <Input
            {...register('fullName', { required: true })}
            placeholder="Nome completo"
            error={errors.fullName ? 'Obrigatório' : undefined}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CPF</label>
          <Input {...register('document')} placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Data de Nascimento</label>
          <Input {...register('birthDate')} type="date" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Cargo <span className="text-danger">*</span>
          </label>
          <Input {...register('position', { required: true })} placeholder="Ex: Analista de Vendas" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Departamento</label>
          <input {...register('department')} list="dept-list" placeholder="Ex: Comercial" className={fc} />
          <datalist id="dept-list">
            {departments.map((d) => <option key={d} value={d} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Vínculo</label>
          <select {...register('employmentType')} className={fc}>
            {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            Data de Admissão <span className="text-danger">*</span>
          </label>
          <Input {...register('hireDate', { required: true })} type="date" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Salário (R$)</label>
          <Input {...register('salary')} type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        {isEdit && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Status</label>
            <select {...register('status')} className={fc}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="on_leave">Afastado</option>
              <option value="terminated">Desligado</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">E-mail</label>
          <Input {...register('email')} type="email" placeholder="colaborador@empresa.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Telefone</label>
          <Input {...register('phone')} placeholder="(11) 99999-9999" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cidade</label>
          <Input {...register('city')} placeholder="São Paulo" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">UF</label>
          <Input {...register('state')} placeholder="SP" maxLength={2} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Endereço</label>
          <Input {...register('address')} placeholder="Rua, número" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Observações</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Informações adicionais..."
          className={fc + ' resize-none'}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Salvar Alterações' : 'Criar Colaborador'}
        </Button>
      </div>
    </form>
  );
}

export function EmployeeModal({ open, onClose, employee }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? `Editar — ${employee.fullName}` : 'Novo Colaborador'}
      size="xl"
    >
      {/* key força remontagem do form (e dos defaultValues) quando o employee muda */}
      <EmployeeForm key={employee?.id ?? 'new'} employee={employee} onClose={onClose} />
    </Modal>
  );
}
