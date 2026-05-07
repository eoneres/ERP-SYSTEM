import { Entity, Column, Index, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

@Entity('users')
@Index(['email', 'tenantId'], { unique: true })
export class User extends TenantBaseEntity {
  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Index()
  @Column({ unique: false, length: 255 })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'phone', nullable: true, length: 20 })
  phone?: string;

  @Exclude()
  @Column({ name: 'refresh_token_hash', nullable: true })
  refreshTokenHash?: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'jsonb', name: 'permissions', default: '[]' })
  permissions: string[];

  @Column({ type: 'jsonb', name: 'preferences', default: '{}' })
  preferences: Record<string, any>;

  // Virtual getters
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isLocked(): boolean {
    return this.lockedUntil ? new Date() < this.lockedUntil : false;
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPasswordIfChanged() {
    // Password hashing is handled in service layer
  }

  hasPermission(permission: string): boolean {
    // Wildcard '*' concede acesso total
    if (this.permissions.includes('*')) return true;
    // Verifica permissão exata
    if (this.permissions.includes(permission)) return true;
    // Verifica wildcard de módulo: 'finance:*' cobre 'finance:view', 'finance:transaction:pay', etc.
    const parts = permission.split(':');
    for (let i = 1; i < parts.length; i++) {
      const wildcard = parts.slice(0, i).join(':') + ':*';
      if (this.permissions.includes(wildcard)) return true;
    }
    return false;
  }
}
