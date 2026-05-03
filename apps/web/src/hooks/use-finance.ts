import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi, type TransactionFilter } from '@/lib/api/finance.api';
import toast from 'react-hot-toast';

// ─── Query keys ───────────────────────────────────────────────────────────────
// IMPORTANTE: financeKeys.all é a raiz de TODAS as queries de finance.
// invalidateQueries({ queryKey: ['finance'] }) invalida tudo que começa com
// ['finance'] no TanStack Query v5 (comportamento padrão sem exact:true).
export const financeKeys = {
  all:          ['finance'] as const,
  accounts:     () => ['finance', 'accounts'] as const,
  categories:   () => ['finance', 'categories'] as const,
  // CORREÇÃO: filter serializado como string para evitar referências instáveis.
  // Sem isso, cada render cria um novo objeto e a queryKey nunca bate.
  transactions: (filter: TransactionFilter = {}) =>
    ['finance', 'transactions', JSON.stringify(filter)] as const,
  transaction:  (id: string) => ['finance', 'transaction', id] as const,
  summary:      (from?: string, to?: string) => ['finance', 'summary', from, to] as const,
  cashflow:     (from: string, to: string, g: string) => ['finance', 'cashflow', from, to, g] as const,
  byCategory:   (from: string, to: string) => ['finance', 'byCategory', from, to] as const,
};

// ─── Invalida TUDO de finance ─────────────────────────────────────────────────
// No TanStack Query v5, passar queryKey: ['finance'] SEM exact:true
// invalida qualquer query cuja key COMEÇA COM ['finance'].
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['finance'] });
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export function useAccounts() {
  return useQuery({
    queryKey: financeKeys.accounts(),
    queryFn:  financeApi.getAccounts,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createAccount,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Conta criada com sucesso!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao criar conta'),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeApi.updateAccount(id, data),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Conta atualizada!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao atualizar conta'),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Conta removida');
    },
    onError: () => toast.error('Erro ao remover conta'),
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: financeKeys.categories(),
    queryFn:  financeApi.getCategories,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createCategory,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Categoria criada!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao criar categoria'),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      financeApi.updateCategory(id, data),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Categoria atualizada!');
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteCategory,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Categoria removida');
    },
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export function useTransactions(filter: TransactionFilter = {}) {
  return useQuery({
    // CORREÇÃO: serializa o filter para evitar nova referência a cada render.
    // Isso garante que invalidateQueries({ queryKey: ['finance'] }) bata nessa
    // query corretamente após criar/editar/pagar/excluir.
    queryKey: financeKeys.transactions(filter),
    queryFn:  () => financeApi.getTransactions(filter),
    // Mantém dados anteriores enquanto busca novos (evita flash de tela vazia)
    placeholderData: (prev: any) => prev,
    // Revalida sempre que a janela recebe foco (garante dados frescos)
    refetchOnWindowFocus: true,
    // staleTime curto para que invalidação dispare refetch imediatamente
    staleTime: 0,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: financeKeys.transaction(id),
    queryFn:  () => financeApi.getTransaction(id),
    enabled:  !!id,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createTransaction,
    onSuccess: async () => {
      // Invalida TODAS as queries de finance para garantir que a lista recarregue
      await invalidateAll(qc);
      toast.success('Transação criada com sucesso!');
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
    onSuccess: async () => {
      await invalidateAll(qc);
      toast.success('Transação atualizada!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao atualizar'),
  });
}

export function usePayTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      paymentDate: string;
      paidAmount?: number;
    }) => financeApi.payTransaction(id, data),
    onSuccess: async () => {
      await invalidateAll(qc);
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
    onSuccess: async () => {
      await invalidateAll(qc);
      toast.success('Transação removida');
    },
    onError: () => toast.error('Erro ao remover transação'),
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useFinanceSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: financeKeys.summary(dateFrom, dateTo),
    queryFn:  () => financeApi.getSummary(dateFrom, dateTo),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useCashFlow(
  dateFrom: string,
  dateTo: string,
  groupBy: 'day' | 'month' = 'month',
) {
  return useQuery({
    queryKey: financeKeys.cashflow(dateFrom, dateTo, groupBy),
    queryFn:  () => financeApi.getCashFlow(dateFrom, dateTo, groupBy),
    enabled:  !!dateFrom && !!dateTo,
    staleTime: 0,
  });
}

export function useByCategory(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: financeKeys.byCategory(dateFrom, dateTo),
    queryFn:  () => financeApi.getByCategory(dateFrom, dateTo),
    enabled:  !!dateFrom && !!dateTo,
    staleTime: 0,
  });
}
