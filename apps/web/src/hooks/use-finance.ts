import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type TransactionFilter } from '@/lib/api/finance.api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const financeKeys = {
  all: ['finance'] as const,
  accounts: () => [...financeKeys.all, 'accounts'] as const,
  categories: () => [...financeKeys.all, 'categories'] as const,
  transactions: (filter?: TransactionFilter) => [...financeKeys.all, 'transactions', filter] as const,
  transaction: (id: string) => [...financeKeys.all, 'transaction', id] as const,
  summary: (from?: string, to?: string) => [...financeKeys.all, 'summary', from, to] as const,
  cashflow: (from: string, to: string, groupBy: string) => [...financeKeys.all, 'cashflow', from, to, groupBy] as const,
  byCategory: (from: string, to: string) => [...financeKeys.all, 'byCategory', from, to] as const,
};

// ─── Accounts ─────────────────────────────────────────────────────────────────
export function useAccounts() {
  return useQuery({
    queryKey: financeKeys.accounts(),
    queryFn: financeApi.getAccounts,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.accounts() });
      toast.success('Conta criada com sucesso!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao criar conta'),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financeApi.updateAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.accounts() });
      toast.success('Conta atualizada!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao atualizar conta'),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.accounts() });
      toast.success('Conta removida');
    },
    onError: () => toast.error('Erro ao remover conta'),
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: financeKeys.categories(),
    queryFn: financeApi.getCategories,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.categories() });
      toast.success('Categoria criada!');
    },
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export function useTransactions(filter: TransactionFilter = {}) {
  return useQuery({
    queryKey: financeKeys.transactions(filter),
    queryFn: () => financeApi.getTransactions(filter),
    placeholderData: (prev) => prev,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: financeKeys.transaction(id),
    queryFn: () => financeApi.getTransaction(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
      toast.success('Transação criada!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao criar transação'),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeApi.updateTransaction(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
      toast.success('Transação atualizada!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao atualizar'),
  });
}

export function usePayTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; paymentDate: string; paidAmount?: number }) =>
      financeApi.payTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
      toast.success('Pagamento registrado! ✓');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao registrar pagamento'),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.all });
      toast.success('Transação removida');
    },
    onError: () => toast.error('Erro ao remover transação'),
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useFinanceSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: financeKeys.summary(dateFrom, dateTo),
    queryFn: () => financeApi.getSummary(dateFrom, dateTo),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCashFlow(
  dateFrom: string,
  dateTo: string,
  groupBy: 'day' | 'month' = 'month',
) {
  return useQuery({
    queryKey: financeKeys.cashflow(dateFrom, dateTo, groupBy),
    queryFn: () => financeApi.getCashFlow(dateFrom, dateTo, groupBy),
    enabled: !!dateFrom && !!dateTo,
  });
}

export function useByCategory(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: financeKeys.byCategory(dateFrom, dateTo),
    queryFn: () => financeApi.getByCategory(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  });
}
