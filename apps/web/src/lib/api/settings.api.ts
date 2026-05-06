import { get, put, patch } from './client';

export interface TenantAddress {
  street?: string; number?: string; complement?: string;
  neighborhood?: string; city?: string; state?: string;
  zipCode?: string; country?: string;
}

export interface TenantBranding {
  primaryColor?: string; secondaryColor?: string;
  fontFamily?: string; customCss?: string;
}

export interface TenantSettings {
  currency?: string; language?: string;
  timezone?: string; dateFormat?: string;
}

export interface Tenant {
  id: string; slug: string;
  companyName: string; tradeName?: string;
  cnpj?: string; email?: string; phone?: string;
  address: TenantAddress;
  plan: string; status: string;
  logoUrl?: string; faviconUrl?: string;
  branding: TenantBranding;
  featureFlags: Record<string, boolean>;
  settings: TenantSettings;
  trialEndsAt?: string; subscriptionEndsAt?: string;
}

export const settingsApi = {
  getSettings:          ()                                  => get<Tenant>('/tenants/settings'),
  updateCompany:        (data: Partial<Tenant>)             => put<Tenant>('/tenants/settings', data),
  updateBranding:       (data: Partial<TenantBranding> & { logoUrl?: string; faviconUrl?: string }) =>
    patch<Tenant>('/tenants/branding', data),
  updateSystemSettings: (data: Partial<TenantSettings>)    => patch<Tenant>('/tenants/system-settings', data),
  updateFeatureFlags:   (featureFlags: Record<string, boolean>) =>
    patch<Tenant>('/tenants/features', { featureFlags }),
};
