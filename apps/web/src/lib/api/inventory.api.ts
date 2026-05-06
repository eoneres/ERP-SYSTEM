import { get, post, put, del } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductStatus = 'active' | 'inactive' | 'draft';
export type ProductUnit   = 'unit' | 'kg' | 'g' | 'l' | 'ml' | 'm' | 'cm' | 'box' | 'pack';
export type MovementType  = 'in' | 'out' | 'transfer' | 'adjust' | 'return' | 'loss';
export type MovementReason =
  | 'purchase' | 'sale' | 'return_in' | 'return_out'
  | 'transfer' | 'adjustment' | 'loss' | 'production' | 'other';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  brand?: string;
  unit: ProductUnit;
  status: ProductStatus;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
  maxStock?: number;
  location?: string;
  imageUrl?: string;
  notes?: string;
  tags: string[];
  isLowStock: boolean;
  stockValue: number;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  isActive: boolean;
  isDefault: boolean;
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
  warehouseId?: string;
  warehouse?: Pick<Warehouse, 'id' | 'name'>;
  destinationWarehouseId?: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unitCost?: number;
  movementDate: string;
  referenceNumber?: string;
  counterpartName?: string;
  notes?: string;
  createdAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockCount: number;
  totalStockValue: number;
  movementsToday: number;
}

export interface ProductFilter {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: ProductStatus;
  category?: string;
  lowStock?: boolean;
}

export interface MovementFilter {
  page?: number;
  limit?: number;
  productId?: string;
  warehouseId?: string;
  type?: MovementType;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateProductPayload {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category?: string;
  brand?: string;
  unit?: ProductUnit;
  status?: ProductStatus;
  costPrice?: number;
  salePrice?: number;
  stockQuantity?: number;
  minStock?: number;
  maxStock?: number;
  location?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateMovementPayload {
  productId: string;
  warehouseId?: string;
  destinationWarehouseId?: string;
  type: MovementType;
  reason?: MovementReason;
  quantity: number;
  unitCost?: number;
  movementDate?: string;
  referenceNumber?: string;
  counterpartName?: string;
  notes?: string;
}

export interface CreateWarehousePayload {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  isDefault?: boolean;
  notes?: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const inventoryApi = {
  // Products
  getProducts: (filter: ProductFilter = {}) =>
    get<{ data: Product[]; meta: PaginationMeta }>('/inventory/products', filter),

  getProduct: (id: string) =>
    get<Product>(`/inventory/products/${id}`),

  getCategories: () =>
    get<string[]>('/inventory/products/categories'),

  getLowStockProducts: () =>
    get<Product[]>('/inventory/products/low-stock'),

  createProduct: (data: CreateProductPayload) =>
    post<Product>('/inventory/products', data),

  updateProduct: (id: string, data: Partial<CreateProductPayload>) =>
    put<Product>(`/inventory/products/${id}`, data),

  deleteProduct: (id: string) =>
    del<void>(`/inventory/products/${id}`),

  // Warehouses
  getWarehouses: () =>
    get<Warehouse[]>('/inventory/warehouses'),

  createWarehouse: (data: CreateWarehousePayload) =>
    post<Warehouse>('/inventory/warehouses', data),

  updateWarehouse: (id: string, data: Partial<CreateWarehousePayload & { isActive?: boolean }>) =>
    put<Warehouse>(`/inventory/warehouses/${id}`, data),

  deleteWarehouse: (id: string) =>
    del<void>(`/inventory/warehouses/${id}`),

  // Movements
  getMovements: (filter: MovementFilter = {}) =>
    get<{ data: StockMovement[]; meta: PaginationMeta }>('/inventory/movements', filter),

  createMovement: (data: CreateMovementPayload) =>
    post<StockMovement>('/inventory/movements', data),

  // Dashboard
  getSummary: () =>
    get<InventorySummary>('/inventory/dashboard/summary'),
};
