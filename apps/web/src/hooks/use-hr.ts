import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  hrApi,
  type EmployeeFilter, type UserFilter,
  type PayrollFilter, type TimeRecordFilter,
} from '@/lib/api/hr.api';
import toast from 'react-hot-toast';

export const hrKeys = {
  all:         ['hr'] as const,
  summary:     () => ['hr', 'summary'] as const,
  employees:   (f: EmployeeFilter = {}) => ['hr', 'employees', JSON.stringify(f)] as const,
  employee:    (id: string) => ['hr', 'employee', id] as const,
  departments: () => ['hr', 'departments'] as const,
  users:       (f: UserFilter = {}) => ['hr', 'users', JSON.stringify(f)] as const,
  user:        (id: string) => ['hr', 'user', id] as const,
  payrolls:    (f: PayrollFilter = {}) => ['hr', 'payrolls', JSON.stringify(f)] as const,
  timeRecords: (f: TimeRecordFilter = {}) => ['hr', 'time-records', JSON.stringify(f)] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['hr'] });
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export function useHRSummary() {
  return useQuery({ queryKey: hrKeys.summary(), queryFn: hrApi.getSummary, staleTime: 5 * 60 * 1000 });
}

// ─── Employees ────────────────────────────────────────────────────────────────
export function useEmployees(filter: EmployeeFilter = {}) {
  return useQuery({
    queryKey: hrKeys.employees(filter),
    queryFn:  () => hrApi.getEmployees(filter),
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}
export function useEmployee(id: string) {
  return useQuery({ queryKey: hrKeys.employee(id), queryFn: () => hrApi.getEmployee(id), enabled: !!id });
}
export function useDepartments() {
  return useQuery({ queryKey: hrKeys.departments(), queryFn: hrApi.getDepartments, staleTime: 10 * 60 * 1000 });
}
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createEmployee,
    onSuccess: () => { invalidateAll(qc); toast.success('Colaborador criado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar colaborador'),
  });
}
export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hrApi.updateEmployee(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Colaborador atualizado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar'),
  });
}
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hrApi.deleteEmployee,
    onSuccess: () => { invalidateAll(qc); toast.success('Colaborador removido'); },
    onError: () => toast.error('Erro ao remover colaborador'),
  });
}

// ─── System Users ─────────────────────────────────────────────────────────────
export function useSystemUsers(filter: UserFilter = {}) {
  return useQuery({
    queryKey: hrKeys.users(filter),
    queryFn:  () => hrApi.getUsers(filter),
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}
export function useCreateSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createUser,
    onSuccess: () => { invalidateAll(qc); toast.success('Usuário criado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar usuário'),
  });
}
export function useUpdateSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hrApi.updateUser(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Usuário atualizado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar usuário'),
  });
}
export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hrApi.toggleStatus,
    onSuccess: () => { invalidateAll(qc); toast.success('Status atualizado!'); },
    onError: () => toast.error('Erro ao atualizar status'),
  });
}
export function useUpdatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      hrApi.updatePermissions(id, permissions),
    onSuccess: () => { invalidateAll(qc); toast.success('Permissões salvas!'); },
    onError: () => toast.error('Erro ao salvar permissões'),
  });
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export function usePayrolls(filter: PayrollFilter = {}) {
  return useQuery({
    queryKey: hrKeys.payrolls(filter),
    queryFn:  () => hrApi.getPayrolls(filter),
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}
export function useCreatePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createPayroll,
    onSuccess: () => { invalidateAll(qc); toast.success('Folha gerada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao gerar folha'),
  });
}
export function useUpdatePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hrApi.updatePayroll(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Folha atualizada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar folha'),
  });
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export function useTimeRecords(filter: TimeRecordFilter = {}) {
  return useQuery({
    queryKey: hrKeys.timeRecords(filter),
    queryFn:  () => hrApi.getTimeRecords(filter),
    staleTime: 30 * 1000,
    placeholderData: (prev: any) => prev,
  });
}
export function useCreateTimeRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createTimeRecord,
    onSuccess: () => { invalidateAll(qc); toast.success('Ponto registrado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao registrar ponto'),
  });
}
export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, checkOut }: { id: string; checkOut: string }) => hrApi.checkOut(id, checkOut),
    onSuccess: () => { invalidateAll(qc); toast.success('Saída registrada!'); },
    onError: () => toast.error('Erro ao registrar saída'),
  });
}
