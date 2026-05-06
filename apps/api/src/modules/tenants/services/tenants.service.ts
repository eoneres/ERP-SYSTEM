import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import {
  UpdateCompanyDto, UpdateBrandingDto,
  UpdateSystemSettingsDto, UpdateFeatureFlagsDto,
} from '../dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async getSettings(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async updateCompany(tenantId: string, dto: UpdateCompanyDto): Promise<Tenant> {
    const tenant = await this.getSettings(tenantId);
    if (dto.companyName !== undefined) tenant.companyName = dto.companyName;
    if (dto.tradeName   !== undefined) tenant.tradeName   = dto.tradeName;
    if (dto.cnpj        !== undefined) tenant.cnpj        = dto.cnpj;
    if (dto.email       !== undefined) tenant.email       = dto.email;
    if (dto.phone       !== undefined) tenant.phone       = dto.phone;
    if (dto.address     !== undefined) tenant.address     = { ...tenant.address, ...dto.address };
    return this.tenantRepo.save(tenant);
  }

  async updateBranding(tenantId: string, dto: UpdateBrandingDto): Promise<Tenant> {
    const tenant = await this.getSettings(tenantId);
    if (dto.logoUrl    !== undefined) tenant.logoUrl    = dto.logoUrl;
    if (dto.faviconUrl !== undefined) tenant.faviconUrl = dto.faviconUrl;
    tenant.branding = {
      ...tenant.branding,
      ...(dto.primaryColor   !== undefined && { primaryColor:   dto.primaryColor   }),
      ...(dto.secondaryColor !== undefined && { secondaryColor: dto.secondaryColor }),
      ...(dto.fontFamily     !== undefined && { fontFamily:     dto.fontFamily     }),
      ...(dto.customCss      !== undefined && { customCss:      dto.customCss      }),
    };
    return this.tenantRepo.save(tenant);
  }

  async updateSystemSettings(tenantId: string, dto: UpdateSystemSettingsDto): Promise<Tenant> {
    const tenant = await this.getSettings(tenantId);
    tenant.settings = { ...tenant.settings, ...dto };
    return this.tenantRepo.save(tenant);
  }

  async updateFeatureFlags(tenantId: string, dto: UpdateFeatureFlagsDto): Promise<Tenant> {
    const tenant = await this.getSettings(tenantId);
    tenant.featureFlags = { ...tenant.featureFlags, ...dto.featureFlags };
    return this.tenantRepo.save(tenant);
  }
}
