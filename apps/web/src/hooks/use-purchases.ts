import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  purchasesApi,
  type SupplierFilter,
  type PurchaseOrderFilter,
  type PurchasePaymentMethod,
} from '@/lib/api/purchases.api';
import toast from 'react-hot-toast';

export const purchasesKeys = {
  all:       ['purchases'] as const,
  summary:   () => ['purchases', 'summary'] as const,
  suppliers: (f: SupplierFilter = {}) => ['purchases', 'suppliers', JSON.stringify(f)] as const,
  supplier:  (id: string) => ['purchases', 'supplier', id] as const,
  orders:    (f: PurchaseOrderFilter = {}) => ['purchases', 'orders', JSON.stringify(f)] as const,
  order:     (id: string) => ['purchases', 'order', id] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['purchases'] });
}
function invalidateFinance(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['finance'] });
}
function invalidateInventory(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['inventory'] });
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export function usePurchasesSummary() {
  return useQuery({
    queryKey: purchasesKeys.summary(),
    queryFn:  purchasesApi.getSummary,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────
export function useSuppliers(filter: SupplierFilter = {}) {
  return useQuery({
    queryKey: purchasesKeys.suppliers(filter),
    queryFn:  () => purchasesApi.getSuppliers(filter),
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}
export function useSupplier(id: string) {
  return useQuery({
    queryKey: purchasesKeys.supplier(id),
    queryFn:  () => purchasesApi.getSupplier(id),
    enabled:  !!id,
  });
}
export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.createSupplier,
    onSuccess: () => { invalidateAll(qc); toast.success('Fornecedor criado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar fornecedor'),
  });
}
export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchasesApi.updateSupplier(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Fornecedor atualizado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar fornecedor'),
  });
}
export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.deleteSupplier,
    onSuccess: () => { invalidateAll(qc); toast.success('Fornecedor excluído!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao excluir fornecedor'),
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export function usePurchaseOrders(filter: PurchaseOrderFilter = {}) {
  return useQuery({
    queryKey: purchasesKeys.orders(filter),
    queryFn:  () => purchasesApi.getOrders(filter),
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}
export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: purchasesKeys.order(id),
    queryFn:  () => purchasesApi.getOrder(id),
    enabled:  !!id,
  });
}
export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.createOrder,
    onSuccess: () => { invalidateAll(qc); toast.success('Ordem de compra criada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar ordem'),
  });
}
export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchasesApi.updateOrder(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Ordem atualizada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar ordem'),
  });
}
export function useConfirmPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentMethod, dueDate }: { id: string; paymentMethod?: PurchasePaymentMethod; dueDate?: string }) =>
      purchasesApi.confirmOrder(id, paymentMethod, dueDate),
    onSuccess: () => {
      invalidateAll(qc);
      invalidateFinance(qc);
      toast.success('Ordem confirmada — conta a pagar criada!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao confirmar ordem'),
  });
}
export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, receivedDate, notes }: { id: string; receivedDate?: string; notes?: string }) =>
      purchasesApi.receiveOrder(id, receivedDate, notes),
    onSuccess: () => {
      invalidateAll(qc);
      invalidateInventory(qc);
      toast.success('Mercadoria recebida — estoque atualizado!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao receber mercadoria'),
  });
}
export function useMarkPurchasePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.markPaid,
    onSuccess: () => {
      invalidateAll(qc);
      invalidateFinance(qc);
      toast.success('Pagamento registrado!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao marcar como pago'),
  });
}
export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.cancelOrder,
    onSuccess: () => {
      invalidateAll(qc);
      invalidateFinance(qc);
      toast.success('Ordem cancelada!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao cancelar ordem'),
  });
}
export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.deleteOrder,
    onSuccess: () => { invalidateAll(qc); toast.success('Rascunho excluído!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao excluir ordem'),
  });
}
