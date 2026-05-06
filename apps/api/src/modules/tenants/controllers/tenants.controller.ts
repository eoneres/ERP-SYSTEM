import { Controller, Get, Put, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from '../services/tenants.service';
import {
  UpdateCompanyDto, UpdateBrandingDto,
  UpdateSystemSettingsDto, UpdateFeatureFlagsDto,
} from '../dto/tenant.dto';
import { JwtAuthGuard, Roles } from '@modules/auth/guards/auth.guard';
import { CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';
import { UserRole } from '@modules/auth/entities/user.entity';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly svc: TenantsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Obter configurações do tenant' })
  async getSettings(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSettings(tenantId));
  }

  @Put('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Atualizar dados da empresa' })
  async updateCompany(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return ApiResponse.ok(await this.svc.updateCompany(tenantId, dto), 'Dados atualizados');
  }

  @Patch('branding')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Atualizar branding (logo, cores, fonte)' })
  async updateBranding(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    return ApiResponse.ok(await this.svc.updateBranding(tenantId, dto), 'Branding atualizado');
  }

  @Patch('system-settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Atualizar configurações do sistema (moeda, timezone, idioma)' })
  async updateSystemSettings(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateSystemSettingsDto,
  ) {
    return ApiResponse.ok(await this.svc.updateSystemSettings(tenantId, dto), 'Configurações salvas');
  }

  @Patch('features')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Atualizar feature flags' })
  async updateFeatureFlags(
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateFeatureFlagsDto,
  ) {
    return ApiResponse.ok(await this.svc.updateFeatureFlags(tenantId, dto), 'Feature flags atualizadas');
  }
}
