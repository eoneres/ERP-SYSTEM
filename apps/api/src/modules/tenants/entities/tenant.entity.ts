import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@shared/entities/base.entity';

export enum TenantPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
}

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 100 })
  slug: string;

  @Column({ name: 'company_name', length: 255 })
  companyName: string;

  @Column({ name: 'trade_name', length: 255, nullable: true })
  tradeName?: string;

  @Column({ length: 20, nullable: true })
  cnpj?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'jsonb', name: 'address', default: '{}' })
  address: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.TRIAL,
  })
  plan: TenantPlan;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.TRIAL,
  })
  status: TenantStatus;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ name: 'favicon_url', nullable: true })
  faviconUrl?: string;

  // White-label: custom branding per tenant
  @Column({ type: 'jsonb', name: 'branding', default: '{}' })
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    customCss?: string;
  };

  // Feature flags per tenant
  @Column({ type: 'jsonb', name: 'feature_flags', default: '{}' })
  featureFlags: Record<string, boolean>;

  // Settings
  @Column({ type: 'jsonb', name: 'settings', default: '{}' })
  settings: {
    currency?: string;
    language?: string;
    timezone?: string;
    dateFormat?: string;
    fiscalYearStart?: number;
  };

  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt?: Date;

  @Column({ name: 'subscription_ends_at', type: 'timestamptz', nullable: true })
  subscriptionEndsAt?: Date;

  get isActive(): boolean {
    return this.status === TenantStatus.ACTIVE || this.status === TenantStatus.TRIAL;
  }

  get isTrialExpired(): boolean {
    if (!this.trialEndsAt) return false;
    return new Date() > this.trialEndsAt;
  }
}
