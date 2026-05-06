import { get, post, put, patch, del } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

export type SupplierType          = 'individual' | 'company';
export type PurchaseOrderStatus   = 'draft' | 'confirmed' | 'received' | 'paid' | 'cancelled';
export type PurchasePaymentMethod = 'cash' | 'credit_card' | 'boleto' | 'transfer' | 'pix' | 'other';

export interface Supplier {
  id: string; name: string; type: SupplierType;
  document?: string; email?: string; phone?: string;
  address?: string; city?: string; state?: string; zipCode?: string;
  contactName?: string; paymentTerms?: string;
  isActive: boolean; notes?: string; createdAt: string;
}

export interface PurchaseOrderItem {
  id: string; productId?: string; productName: string; productSku?: string;
  quantity: number; unitCost: number; total: number; receivedQuantity: number; notes?: string;
}

export interface PurchaseOrder {
  id: string; orderNumber: string;
  supplierId?: string;
  supplier?: Pick<Supplier, 'id' | 'name' | 'email' | 'phone'>;
  status: PurchaseOrderStatus;
  paymentMethod?: PurchasePaymentMethod;
  orderDate: string; expectedDate?: string; receivedDate?: string; dueDate?: string;
  subtotal: number; discount: number; shipping: number; total: number;
  financeTransactionId?: string;
  referenceNumber?: string; notes?: string;
  items?: PurchaseOrderItem[];
  createdAt: string;
}

export interface PurchasesSummary {
  totalOrders: number; pendingOrders: number;
  totalSuppliers: number; totalSpend: number;
}

export interface SupplierFilter {
  page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: 'ASC' | 'DESC';
  type?: SupplierType; isActive?: boolean;
}

export interface PurchaseOrderFilter {
  page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: 'ASC' | 'DESC';
  status?: PurchaseOrderStatus; supplierId?: string;
  dateFrom?: string; dateTo?: string;
}

export interface CreatePurchaseItemPayload {
  productId?: string; productName: string; productSku?: string;
  quantity: number; unitCost: number; notes?: string;
}

export interface CreatePurchaseOrderPayload {
  supplierId?: string; paymentMethod?: PurchasePaymentMethod;
  orderDate?: string; expectedDate?: string; dueDate?: string;
  discount?: number; shipping?: number;
  referenceNumber?: string; notes?: string;
  items: CreatePurchaseItemPayload[];
}

export const purchasesApi = {
  // Suppliers
  getSuppliers:   (f: SupplierFilter = {}) => get<{ data: Supplier[]; meta: PaginationMeta }>('/purchases/suppliers', f),
  getSupplier:    (id: string)             => get<Supplier>(`/purchases/suppliers/${id}`),
  createSupplier: (data: Partial<Supplier>) => post<Supplier>('/purchases/suppliers', data),
  updateSupplier: (id: string, data: Partial<Supplier>) => put<Supplier>(`/purchases/suppliers/${id}`, data),
  deleteSupplier: (id: string)             => del<void>(`/purchases/suppliers/${id}`),

  // Orders
  getOrders:   (f: PurchaseOrderFilter = {}) => get<{ data: PurchaseOrder[]; meta: PaginationMeta }>('/purchases/orders', f),
  getOrder:    (id: string)                  => get<PurchaseOrder>(`/purchases/orders/${id}`),
  createOrder: (data: CreatePurchaseOrderPayload) => post<PurchaseOrder>('/purchases/orders', data),
  updateOrder: (id: string, data: Partial<CreatePurchaseOrderPayload>) => put<PurchaseOrder>(`/purchases/orders/${id}`, data),
  confirmOrder: (id: string, paymentMethod?: PurchasePaymentMethod, dueDate?: string) =>
    patch<PurchaseOrder>(`/purchases/orders/${id}/confirm`, { paymentMethod, dueDate }),
  receiveOrder: (id: string, receivedDate?: string, notes?: string) =>
    patch<PurchaseOrder>(`/purchases/orders/${id}/receive`, { receivedDate, notes }),
  markPaid:    (id: string) => patch<PurchaseOrder>(`/purchases/orders/${id}/mark-paid`, {}),
  cancelOrder: (id: string) => patch<PurchaseOrder>(`/purchases/orders/${id}/cancel`, {}),
  deleteOrder: (id: string) => del<void>(`/purchases/orders/${id}`),

  // Dashboard
  getSummary: () => get<PurchasesSummary>('/purchases/dashboard/summary'),
};
