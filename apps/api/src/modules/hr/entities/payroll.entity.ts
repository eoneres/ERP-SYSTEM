import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Employee } from './employee.entity';

export enum PayrollStatus {
  DRAFT     = 'draft',
  PROCESSED = 'processed',
  PAID      = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('hr_payrolls')
@Index(['tenantId', 'employeeId', 'referenceMonth'], { unique: true })
export class Payroll extends TenantBaseEntity {
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'reference_month', length: 7 }) // YYYY-MM
  referenceMonth: string;

  @Column({ name: 'base_salary', type: 'decimal', precision: 15, scale: 2 })
  baseSalary: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  bonuses: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  deductions: number;

  @Column({ name: 'inss_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
  inssDeduction: number;

  @Column({ name: 'irrf_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
  irrfDeduction: number;

  @Column({ name: 'fgts_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  fgtsAmount: number;

  @Column({ name: 'net_salary', type: 'decimal', precision: 15, scale: 2 })
  netSalary: number;

  @Column({ name: 'worked_days', type: 'int', default: 30 })
  workedDays: number;

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
