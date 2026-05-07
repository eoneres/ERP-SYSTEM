import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsService }    from './services/tenants.service';
import { TenantsController } from './controllers/tenants.controller';
import { TenantStatusGuard } from './guards/tenant-status.guard';

@Module({
  imports:     [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantsController],
  providers:   [TenantsService, TenantStatusGuard],
  exports:     [TypeOrmModule, TenantsService, TenantStatusGuard],
})
export class TenantsModule {}
