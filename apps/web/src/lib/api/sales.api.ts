import { get, post, put, patch, del } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CustomerType  = 'individual' | 'company';
export type OrderStatus   = 'draft' | 'confirmed' | 'invoiced' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'transfer' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';

export interface Customer {
  id: string; name: string; type: CustomerType;
  email?: string; phone?: string; document?: string;
  address?: string; city?: string; state?: string; zipCode?: string;
  isActive: boolean; notes?: string; createdAt: string;
}

export interface OrderItem {
  id: string; productId?: string; productName: string; productSku?: string;
  quantity: number; unitPrice: number; discount: number; total: number; notes?: string;
}

export interface Order {
  id: string; orderNumber: string;
  customerId?: string;
  customer?: Pick<Customer, 'id' | 'name' | 'email' | 'phone'>;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  invoiceTransactionId?: string;
  stockReserved: boolean;
  orderDate: string; deliveryDate?: string;
  subtotal: number; discount: number; shipping: number;
  total: number; paidAmount: number;
  shippingAddress?: string; referenceNumber?: string; notes?: string;
  items?: OrderItem[];
  createdAt: string;
}

export interface SalesSummary {
  totalOrders: number; pendingOrders: number; totalCustomers: number;
  totalRevenue: number; pendingRevenue: number; ordersThisMonth: number;
}

export interface CustomerFilter {
  page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: 'ASC' | 'DESC';
  type?: CustomerType; isActive?: boolean;
}

export interface OrderFilter {
  page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: 'ASC' | 'DESC';
  status?: OrderStatus; paymentStatus?: PaymentStatus;
  customerId?: string; dateFrom?: string; dateTo?: string;
}

export interface CreateOrderItemPayload {
  productId?: string; productName: string; productSku?: string;
  quantity: number; unitPrice: number; discount?: number; notes?: string;
}

export interface CreateOrderPayload {
  customerId?: string; paymentMethod?: PaymentMethod;
  orderDate?: string; deliveryDate?: string;
  discount?: number; shipping?: number;
  shippingAddress?: string; referenceNumber?: string; notes?: string;
  items: CreateOrderItemPayload[];
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const salesApi = {
  // Customers
  getCustomers:   (f: CustomerFilter = {}) => get<{ data: Customer[]; meta: PaginationMeta }>('/sales/customers', f),
  getCustomer:    (id: string)             => get<Customer>(`/sales/customers/${id}`),
  createCustomer: (data: Partial<Customer>) => post<Customer>('/sales/customers', data),
  updateCustomer: (id: string, data: Partial<Customer>) => put<Customer>(`/sales/customers/${id}`, data),
  deleteCustomer: (id: string)             => del<void>(`/sales/customers/${id}`),

  // Orders — CRUD
  getOrders:   (f: OrderFilter = {})                    => get<{ data: Order[]; meta: PaginationMeta }>('/sales/orders', f),
  getOrder:    (id: string)                             => get<Order>(`/sales/orders/${id}`),
  createOrder: (data: CreateOrderPayload)               => post<Order>('/sales/orders', data),
  updateOrder: (id: string, data: Partial<CreateOrderPayload>) => put<Order>(`/sales/orders/${id}`, data),
  deleteOrder: (id: string)                             => del<void>(`/sales/orders/${id}`),

  // Orders — Fluxo de negócio
  confirmOrder: (id: string, paymentMethod?: PaymentMethod) =>
    patch<Order>(`/sales/orders/${id}/confirm`, { paymentMethod }),

  invoiceOrder: (id: string, paymentMethod: PaymentMethod, dueDate?: string, description?: string) =>
    patch<Order>(`/sales/orders/${id}/invoice`, { paymentMethod, dueDate, description }),

  markPaid: (id: string, paymentDate?: string, paidAmount?: number) =>
    patch<Order>(`/sales/orders/${id}/mark-paid`, { paymentDate, paidAmount }),

  cancelOrder: (id: string) =>
    patch<Order>(`/sales/orders/${id}/cancel`, {}),

  // Dashboard
  getSummary:     () => get<SalesSummary>('/sales/dashboard/summary'),
  getRecentOrders: () => get<Order[]>('/sales/dashboard/recent-orders'),
};
