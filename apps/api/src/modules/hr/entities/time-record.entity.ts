import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Employee } from './employee.entity';

export enum TimeRecordType {
  REGULAR  = 'regular',
  OVERTIME = 'overtime',
  ABSENCE  = 'absence',
  VACATION = 'vacation',
  HOLIDAY  = 'holiday',
}

@Entity('hr_time_records')
@Index(['tenantId', 'employeeId', 'checkIn'])
export class TimeRecord extends TenantBaseEntity {
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'check_in', type: 'timestamptz' })
  checkIn: Date;

  @Column({ name: 'check_out', type: 'timestamptz', nullable: true })
  checkOut?: Date;

  @Column({ type: 'enum', enum: TimeRecordType, default: TimeRecordType.REGULAR })
  type: TimeRecordType;

  // Minutos trabalhados (calculado ao registrar checkout)
  @Column({ name: 'minutes_worked', type: 'int', nullable: true })
  minutesWorked?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
