import { get } from './client';

export interface DashboardFinance {
  totalIncome: number; totalExpense: number; netBalance: number;
  overdueAmount: number; overdueCount: number;
  pendingIncome: number; pendingExpense: number;
}

export interface DashboardSales {
  totalOrders: number; pendingOrders: number;
  awaitingPayment: number; ordersThisMonth: number;
  totalRevenue: number; avgTicket: number;
}

export interface DashboardInventory {
  totalProducts: number; activeProducts: number;
  lowStock: number; outOfStock: number; stockValue: number;
}

export interface DashboardHR {
  totalEmployees: number; activeEmployees: number; payrollThisMonth: number;
}

export interface ChartPoint { month: string; receita: number; despesas: number; }

export interface DashboardSummary {
  finance:   DashboardFinance;
  sales:     DashboardSales;
  inventory: DashboardInventory;
  hr:        DashboardHR;
  chart:     ChartPoint[];
}

export interface ActivityItem {
  type:        string;
  resource_id: string;
  title:       string;
  subtitle:    string;
  amount:      number;
  occurred_at: string;
}

export interface DashboardAlerts {
  lowStock:        { id: string; name: string; stock_quantity: number; min_stock: number; sku?: string }[];
  overdue:         { id: string; description: string; amount: number; due_date: string; counterpart_name?: string }[];
  awaitingInvoice: { id: string; order_number: string; total: number; customer?: string }[];
}

export const dashboardApi = {
  getSummary:  () => get<DashboardSummary>('/dashboard/summary'),
  getActivity: () => get<ActivityItem[]>('/dashboard/activity'),
  getAlerts:   () => get<DashboardAlerts>('/dashboard/alerts'),
};
