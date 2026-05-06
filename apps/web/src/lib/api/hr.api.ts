import { get, post, put, patch, del } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

// ─── Types ────────────────────────────────────────────────────────────────────
export type EmployeeStatus  = 'active' | 'inactive' | 'terminated' | 'on_leave';
export type EmploymentType  = 'clt' | 'pj' | 'intern' | 'freelancer' | 'temporary';
export type PayrollStatus   = 'draft' | 'processed' | 'paid' | 'cancelled';
export type TimeRecordType  = 'regular' | 'overtime' | 'absence' | 'vacation' | 'holiday';
export type UserRole        = 'super_admin' | 'tenant_admin' | 'manager' | 'employee' | 'viewer';
export type UserStatus      = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Employee {
  id: string; fullName: string; document?: string;
  birthDate?: string; hireDate: string; terminationDate?: string;
  position: string; department?: string;
  employmentType: EmploymentType; status: EmployeeStatus;
  salary: number; email?: string; phone?: string;
  address?: string; city?: string; state?: string;
  userId?: string; managerId?: string; avatarUrl?: string;
  notes?: string; createdAt: string;
}

export interface SystemUser {
  id: string; firstName: string; lastName: string; email: string;
  role: UserRole; status: UserStatus;
  permissions: string[]; lastLoginAt?: string;
  employeeId?: string; avatarUrl?: string; createdAt: string;
}

export interface Payroll {
  id: string; employeeId: string;
  employee?: Pick<Employee, 'id' | 'fullName' | 'position' | 'department'>;
  referenceMonth: string; baseSalary: number;
  bonuses: number; deductions: number;
  inssDeduction: number; irrfDeduction: number; fgtsAmount: number;
  netSalary: number; workedDays: number;
  status: PayrollStatus; paymentDate?: string; notes?: string;
}

export interface TimeRecord {
  id: string; employeeId: string;
  employee?: Pick<Employee, 'id' | 'fullName'>;
  checkIn: string; checkOut?: string;
  type: TimeRecordType; minutesWorked?: number; notes?: string;
}

export interface HRSummary {
  totalEmployees: number; activeEmployees: number;
  totalUsers: number; payrollThisMonth: number;
}

export interface EmployeeFilter {
  page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: 'ASC' | 'DESC';
  status?: EmployeeStatus; department?: string; employmentType?: EmploymentType;
}

export interface UserFilter {
  page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: 'ASC' | 'DESC';
  role?: UserRole; isActive?: boolean;
}

export interface PayrollFilter {
  page?: number; limit?: number;
  employeeId?: string; referenceMonth?: string; status?: PayrollStatus;
}

export interface TimeRecordFilter {
  page?: number; limit?: number;
  employeeId?: string; dateFrom?: string; dateTo?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const hrApi = {
  // Employees
  getEmployees:   (f: EmployeeFilter = {}) => get<{ data: Employee[]; meta: PaginationMeta }>('/hr/employees', f),
  getEmployee:    (id: string)             => get<Employee>(`/hr/employees/${id}`),
  getDepartments: ()                       => get<string[]>('/hr/employees/departments'),
  createEmployee: (data: Partial<Employee> & { hireDate: string; position: string; fullName: string }) =>
    post<Employee>('/hr/employees', data),
  updateEmployee: (id: string, data: Partial<Employee>) => put<Employee>(`/hr/employees/${id}`, data),
  deleteEmployee: (id: string)             => del<void>(`/hr/employees/${id}`),

  // System Users
  getUsers:       (f: UserFilter = {})     => get<{ data: SystemUser[]; meta: PaginationMeta }>('/hr/users', f),
  getUser:        (id: string)             => get<SystemUser>(`/hr/users/${id}`),
  createUser:     (data: any)              => post<SystemUser>('/hr/users', data),
  updateUser:     (id: string, data: any)  => put<SystemUser>(`/hr/users/${id}`, data),
  toggleStatus:   (id: string)             => patch<SystemUser>(`/hr/users/${id}/toggle-status`, {}),
  updatePermissions: (id: string, permissions: string[]) =>
    patch<SystemUser>(`/hr/users/${id}/permissions`, { permissions }),

  // Payroll
  getPayrolls:   (f: PayrollFilter = {})   => get<{ data: Payroll[]; meta: PaginationMeta }>('/hr/payroll', f),
  createPayroll: (data: any)               => post<Payroll>('/hr/payroll', data),
  updatePayroll: (id: string, data: any)   => put<Payroll>(`/hr/payroll/${id}`, data),

  // Attendance
  getTimeRecords:   (f: TimeRecordFilter = {}) => get<{ data: TimeRecord[]; meta: PaginationMeta }>('/hr/attendance', f),
  createTimeRecord: (data: any)                => post<TimeRecord>('/hr/attendance', data),
  checkOut:         (id: string, checkOut: string) => patch<TimeRecord>(`/hr/attendance/${id}/checkout`, { checkOut }),

  // Dashboard
  getSummary: () => get<HRSummary>('/hr/dashboard/summary'),
};
