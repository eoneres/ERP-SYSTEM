import { Entity, Column, Index, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum EmployeeStatus {
  ACTIVE     = 'active',
  INACTIVE   = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE   = 'on_leave',
}

export enum EmploymentType {
  CLT        = 'clt',
  PJ         = 'pj',
  INTERN     = 'intern',
  FREELANCER = 'freelancer',
  TEMPORARY  = 'temporary',
}

@Entity('hr_employees')
@Index(['tenantId', 'document'], { unique: true, where: '"deleted_at" IS NULL AND document IS NOT NULL' })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'department'])
export class Employee extends TenantBaseEntity {
  @Column({ name: 'full_name', length: 200 })
  fullName: string;

  @Column({ length: 20, nullable: true })
  document?: string; // CPF

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ name: 'hire_date', type: 'date' })
  hireDate: Date;

  @Column({ name: 'termination_date', type: 'date', nullable: true })
  terminationDate?: Date;

  @Column({ length: 150 })
  position: string; // cargo

  @Column({ length: 100, nullable: true })
  department?: string;

  @Column({ type: 'enum', enum: EmploymentType, default: EmploymentType.CLT })
  employmentType: EmploymentType;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  salary: number;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 2, nullable: true })
  state?: string;

  // FK para User — nullable, nem todo colaborador tem acesso ao sistema
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
