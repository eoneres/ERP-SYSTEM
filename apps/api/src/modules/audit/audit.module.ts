import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog }        from './entities/audit-log.entity';
import { AuditService }    from './services/audit.service';
import { AuditController } from './controllers/audit.controller';

@Global() // Global so AuditService can be injected in the interceptor
@Module({
  imports:     [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers:   [AuditService],
  exports:     [AuditService],
})
export class AuditModule {}
