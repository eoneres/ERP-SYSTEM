import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, type CustomerFilter, type OrderFilter, type PaymentMethod } from '@/lib/api/sales.api';
import toast from 'react-hot-toast';

export const salesKeys = {
  all:          ['sales'] as const,
  summary:      () => ['sales', 'summary'] as const,
  recentOrders: () => ['sales', 'recent-orders'] as const,
  customers:    (f: CustomerFilter = {}) => ['sales', 'customers', JSON.stringify(f)] as const,
  customer:     (id: string) => ['sales', 'customer', id] as const,
  orders:       (f: OrderFilter = {}) => ['sales', 'orders', JSON.stringify(f)] as const,
  order:        (id: string) => ['sales', 'order', id] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['sales'] });
}
function invalidateFinance(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['finance'] });
}
function invalidateInventory(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['inventory'] });
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export function useSalesSummary() {
  return useQuery({ queryKey: salesKeys.summary(), queryFn: salesApi.getSummary, staleTime: 2 * 60 * 1000 });
}
export function useRecentOrders() {
  return useQuery({ queryKey: salesKeys.recentOrders(), queryFn: salesApi.getRecentOrders, staleTime: 60 * 1000 });
}

// ─── Customers ────────────────────────────────────────────────────────────────
export function useCustomers(filter: CustomerFilter = {}) {
  return useQuery({
    queryKey: salesKeys.customers(filter),
    queryFn:  () => salesApi.getCustomers(filter),
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}
export function useCustomer(id: string) {
  return useQuery({ queryKey: salesKeys.customer(id), queryFn: () => salesApi.getCustomer(id), enabled: !!id });
}
export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.createCustomer,
    onSuccess: () => { invalidateAll(qc); toast.success('Cliente criado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar cliente'),
  });
}
export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => salesApi.updateCustomer(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Cliente atualizado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar cliente'),
  });
}
export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.deleteCustomer,
    onSuccess: () => { invalidateAll(qc); toast.success('Cliente removido'); },
    onError: () => toast.error('Erro ao remover cliente'),
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export function useOrders(filter: OrderFilter = {}) {
  return useQuery({
    queryKey: salesKeys.orders(filter),
    queryFn:  () => salesApi.getOrders(filter),
    staleTime: 0,
    placeholderData: (prev: any) => prev,
    refetchOnWindowFocus: true,
  });
}
export function useOrder(id: string) {
  return useQuery({ queryKey: salesKeys.order(id), queryFn: () => salesApi.getOrder(id), enabled: !!id });
}
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.createOrder,
    onSuccess: () => { invalidateAll(qc); toast.success('Pedido criado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar pedido'),
  });
}
export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => salesApi.updateOrder(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Pedido atualizado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar pedido'),
  });
}
export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.deleteOrder,
    onSuccess: () => { invalidateAll(qc); toast.success('Pedido removido'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao remover pedido'),
  });
}

// ─── Fluxo de negócio ─────────────────────────────────────────────────────────

export function useConfirmOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod?: PaymentMethod }) =>
      salesApi.confirmOrder(id, paymentMethod),
    onSuccess: () => {
      invalidateAll(qc);
      invalidateInventory(qc); // estoque foi reservado
      toast.success('Pedido confirmado — estoque reservado ✓');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao confirmar pedido'),
  });
}

export function useInvoiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentMethod, dueDate, description }: {
      id: string; paymentMethod: PaymentMethod; dueDate?: string; description?: string;
    }) => salesApi.invoiceOrder(id, paymentMethod, dueDate, description),
    onSuccess: () => {
      invalidateAll(qc);
      invalidateInventory(qc); // movimentação de saída criada
      invalidateFinance(qc);   // conta a receber criada
      toast.success('Pedido faturado — conta a receber criada ✓');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao faturar pedido'),
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentDate, paidAmount }: { id: string; paymentDate?: string; paidAmount?: number }) =>
      salesApi.markPaid(id, paymentDate, paidAmount),
    onSuccess: () => {
      invalidateAll(qc);
      invalidateFinance(qc); // transaction financeira atualizada
      toast.success('Pagamento registrado ✓');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao registrar pagamento'),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.cancelOrder,
    onSuccess: () => {
      invalidateAll(qc);
      invalidateInventory(qc); // estoque devolvido
      invalidateFinance(qc);   // transaction cancelada
      toast.success('Pedido cancelado — estoque liberado');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao cancelar pedido'),
  });
}
