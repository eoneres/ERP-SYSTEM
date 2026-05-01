import { get, post, put, patch, del } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AccountType = 'checking' | 'savings' | 'cash' | 'credit_card' | 'investment' | 'other';
export type CategoryType = 'income' | 'expense' | 'both';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'scheduled';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  bankName?: string;
  accountNumber?: string;
  color: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon?: string;
  parentId?: string;
  children?: Category[];
  isActive: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  dueDate: string;
  paymentDate?: string;
  paidAmount?: number;
  account?: Account;
  category?: Category;
  counterpartName?: string;
  referenceNumber?: string;
  tags: string[];
  notes?: string;
  recurrence: RecurrenceType;
  createdAt: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  overdueCount: number;
  overdueAmount: number;
  accountsBalance: number;
}

export interface CashFlowItem {
  date: string;
  income: number;
  expense: number;
  balance: number;
  accumulated: number;
}

export interface TransactionFilter {
  page?: number;
  limit?: number;
  search?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedTransactions {
  data: Transaction[];
  meta: PaginationMeta;
}

// ─── API calls ────────────────────────────────────────────────────────────────
export const financeApi = {
  // Accounts
  getAccounts: () => get<Account[]>('/finance/accounts'),
  createAccount: (data: Partial<Account>) => post<Account>('/finance/accounts', data),
  updateAccount: (id: string, data: Partial<Account>) => put<Account>(`/finance/accounts/${id}`, data),
  deleteAccount: (id: string) => del(`/finance/accounts/${id}`),

  // Categories
  getCategories: () => get<Category[]>('/finance/categories'),
  createCategory: (data: Partial<Category>) => post<Category>('/finance/categories', data),
  updateCategory: (id: string, data: Partial<Category>) => put<Category>(`/finance/categories/${id}`, data),
  deleteCategory: (id: string) => del(`/finance/categories/${id}`),

  // Transactions
  getTransactions: (filter: TransactionFilter = {}) =>
    get<PaginatedTransactions>('/finance/transactions', filter as any),
  getTransaction: (id: string) => get<Transaction>(`/finance/transactions/${id}`),
  createTransaction: (data: Partial<Transaction>) => post<Transaction>('/finance/transactions', data),
  updateTransaction: (id: string, data: Partial<Transaction>) =>
    put<Transaction>(`/finance/transactions/${id}`, data),
  payTransaction: (id: string, data: { paymentDate: string; paidAmount?: number; accountId?: string }) =>
    patch<Transaction>(`/finance/transactions/${id}/pay`, data),
  deleteTransaction: (id: string) => del(`/finance/transactions/${id}`),

  // Dashboard
  getSummary: (dateFrom?: string, dateTo?: string) =>
    get<FinanceSummary>('/finance/dashboard/summary', { dateFrom, dateTo } as any),
  getCashFlow: (dateFrom: string, dateTo: string, groupBy: 'day' | 'month' = 'month') =>
    get<CashFlowItem[]>('/finance/dashboard/cashflow', { dateFrom, dateTo, groupBy } as any),
  getByCategory: (dateFrom: string, dateTo: string) =>
    get<any[]>('/finance/dashboard/by-category', { dateFrom, dateTo } as any),
};
