import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, type ProductFilter, type MovementFilter } from '@/lib/api/inventory.api';
import toast from 'react-hot-toast';

// ─── Query keys ───────────────────────────────────────────────────────────────
export const inventoryKeys = {
  all:        ['inventory'] as const,
  summary:    () => ['inventory', 'summary'] as const,
  products:   (filter: ProductFilter = {}) => ['inventory', 'products', JSON.stringify(filter)] as const,
  product:    (id: string) => ['inventory', 'product', id] as const,
  categories: () => ['inventory', 'categories'] as const,
  lowStock:   () => ['inventory', 'low-stock'] as const,
  warehouses: () => ['inventory', 'warehouses'] as const,
  movements:  (filter: MovementFilter = {}) => ['inventory', 'movements', JSON.stringify(filter)] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['inventory'] });
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export function useInventorySummary() {
  return useQuery({
    queryKey: inventoryKeys.summary(),
    queryFn:  inventoryApi.getSummary,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────
export function useProducts(filter: ProductFilter = {}) {
  return useQuery({
    queryKey: inventoryKeys.products(filter),
    queryFn:  () => inventoryApi.getProducts(filter),
    staleTime: 60 * 1000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: inventoryKeys.product(id),
    queryFn:  () => inventoryApi.getProduct(id),
    enabled:  !!id,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn:  inventoryApi.getCategories,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn:  inventoryApi.getLowStockProducts,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createProduct,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Produto criado com sucesso!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao criar produto'),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      inventoryApi.updateProduct(id, data),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Produto atualizado!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao atualizar produto'),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteProduct,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Produto removido');
    },
    onError: () => toast.error('Erro ao remover produto'),
  });
}

// ─── Warehouses ───────────────────────────────────────────────────────────────
export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn:  inventoryApi.getWarehouses,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createWarehouse,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Depósito criado!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao criar depósito'),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      inventoryApi.updateWarehouse(id, data),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Depósito atualizado!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao atualizar depósito'),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteWarehouse,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Depósito desativado');
    },
    onError: () => toast.error('Erro ao desativar depósito'),
  });
}

// ─── Movements ────────────────────────────────────────────────────────────────
export function useMovements(filter: MovementFilter = {}) {
  return useQuery({
    queryKey: inventoryKeys.movements(filter),
    queryFn:  () => inventoryApi.getMovements(filter),
    staleTime: 60 * 1000,
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createMovement,
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Movimentação registrada!');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? 'Erro ao registrar movimentação'),
  });
}
