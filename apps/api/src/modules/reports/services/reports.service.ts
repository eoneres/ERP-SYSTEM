import {
  Injectable, NotFoundException, BadRequestException,
  Logger, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ReportTemplate, ReportModule as RModule } from '../entities/report-template.entity';
import { ReportExecution, ExecutionStatus, ExportFormat } from '../entities/report-execution.entity';
import { ReportQueryEngine } from './report-query.engine';
import { ReportExportService } from './report-export.service';
import { SYSTEM_TEMPLATES } from './report-templates.seed';

export interface GenerateReportDto {
  templateId: string;
  format:     ExportFormat;
  parameters: Record<string, any>;
}

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(ReportTemplate)  private readonly templateRepo:  Repository<ReportTemplate>,
    @InjectRepository(ReportExecution) private readonly executionRepo: Repository<ReportExecution>,
    private readonly queryEngine:  ReportQueryEngine,
    private readonly exportService: ReportExportService,
    private readonly eventEmitter:  EventEmitter2,
  ) {}

  // ─── Seed system templates on startup ─────────────────────────────────────
  async onModuleInit() {
    // Re-seed: remove templates de sistema desatualizados e recria
    await this.templateRepo.delete({ isSystem: true });

    for (const tpl of SYSTEM_TEMPLATES) {
      await this.templateRepo.save(
        this.templateRepo.create({
          ...tpl,
          tenantId: '00000000-0000-0000-0000-000000000000',
        }),
      );
      this.logger.log(`[Reports] Seeded template: ${tpl.name}`);
    }
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  async getTemplates(tenantId: string, module?: RModule) {
    const qb = this.templateRepo.createQueryBuilder('t')
      .where('(t.tenantId = :tenantId OR t.isSystem = true)', { tenantId })
      .andWhere('t.isActive = true');

    if (module) qb.andWhere('t.module = :module', { module });

    return qb.orderBy('t.module').addOrderBy('t.name').getMany();
  }

  async getTemplate(id: string, tenantId: string) {
    const tpl = await this.templateRepo.findOne({
      where: [{ id, tenantId }, { id, isSystem: true }],
    });
    if (!tpl) throw new NotFoundException('Template não encontrado');
    return tpl;
  }

  // ─── Generate ─────────────────────────────────────────────────────────────

  async generate(tenantId: string, userId: string, dto: GenerateReportDto) {
    const template = await this.getTemplate(dto.templateId, tenantId);

    // Validate required filters
    for (const filter of template.filters) {
      if (filter.required && !dto.parameters[filter.key]) {
        throw new BadRequestException(`Filtro obrigatório: "${filter.label}"`);
      }
    }

    // Create execution record
    const execution = await this.executionRepo.save(
      this.executionRepo.create({
        tenantId,
        createdBy:  userId,
        executedBy: userId,
        templateId: template.id,
        parameters: dto.parameters,
        format:     dto.format,
        status:     ExecutionStatus.PROCESSING,
      }),
    );

    this.eventEmitter.emit('reports.REPORT_REQUESTED', { tenantId, executionId: execution.id });

    // Execute synchronously (async queue can be added later)
    try {
      const rows = await this.queryEngine.execute(
        template.queryDefinition,
        tenantId,
        dto.parameters,
      );

      const { buffer, mimeType, extension } = await this.exportService.generate(
        dto.format,
        template.columns,
        rows,
        template.name,
      );

      // Store as base64 data URL (no file system needed)
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

      await this.executionRepo.update(execution.id, {
        status:      ExecutionStatus.COMPLETED,
        fileUrl:     dataUrl,
        rowCount:    rows.length,
        completedAt: new Date(),
      });

      this.eventEmitter.emit('reports.REPORT_GENERATED', { tenantId, executionId: execution.id, rowCount: rows.length });

      return {
        executionId: execution.id,
        rowCount:    rows.length,
        fileName:    `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.${extension}`,
        mimeType,
        buffer:      buffer.toString('base64'),
      };
    } catch (err: any) {
      await this.executionRepo.update(execution.id, {
        status:       ExecutionStatus.FAILED,
        errorMessage: err.message,
      });
      this.eventEmitter.emit('reports.REPORT_FAILED', { tenantId, executionId: execution.id, error: err.message });
      throw new BadRequestException(`Erro ao gerar relatório: ${err.message}`);
    }
  }

  // ─── Executions history ───────────────────────────────────────────────────

  async getExecutions(tenantId: string, page = 1, limit = 20) {
    const [items, total] = await this.executionRepo.findAndCount({
      where: { tenantId },
      relations: ['template'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
