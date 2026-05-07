import {
  Injectable, NotFoundException, BadRequestException,
  Logger, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { ReportTemplate, ReportModule as RModule } from '../entities/report-template.entity';
import { ReportExecution, ExecutionStatus, ExportFormat } from '../entities/report-execution.entity';
import { ReportQueryEngine } from './report-query.engine';
import { ReportExportService } from './report-export.service';
import { SYSTEM_TEMPLATES } from './report-templates.seed';

export const REPORTS_QUEUE = 'reports';

export interface GenerateReportDto {
  templateId: string;
  format:     ExportFormat;
  parameters: Record<string, any>;
}

/** Limite de linhas por formato para evitar timeout */
const ROW_LIMITS: Record<ExportFormat, number> = {
  [ExportFormat.CSV]:  50_000,
  [ExportFormat.XLSX]: 10_000,
  [ExportFormat.PDF]:    500,
};

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(ReportTemplate)  private readonly templateRepo:  Repository<ReportTemplate>,
    @InjectRepository(ReportExecution) private readonly executionRepo: Repository<ReportExecution>,
    private readonly queryEngine:  ReportQueryEngine,
    private readonly exportService: ReportExportService,
    private readonly eventEmitter:  EventEmitter2,
    @InjectQueue(REPORTS_QUEUE) private readonly reportsQueue: Queue,
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

    for (const filter of template.filters) {
      if (filter.required && !dto.parameters[filter.key]) {
        throw new BadRequestException(`Filtro obrigatório: "${filter.label}"`);
      }
    }

    // Cria registro de execução com status PENDING
    const execution = await this.executionRepo.save(
      this.executionRepo.create({
        tenantId,
        createdBy:  userId,
        executedBy: userId,
        templateId: template.id,
        parameters: dto.parameters,
        format:     dto.format,
        status:     ExecutionStatus.PENDING,
      }),
    );

    this.eventEmitter.emit('reports.REPORT_REQUESTED', { tenantId, executionId: execution.id });

    // Tenta enfileirar no BullMQ; se Redis indisponível, executa inline
    try {
      const queue = this.reportsQueue;
      // Verifica se a fila está operacional antes de enfileirar
      await queue.isReady();
      await queue.add(
        'generate',
        { executionId: execution.id, tenantId, templateId: template.id, format: dto.format, parameters: dto.parameters },
        { attempts: 2, backoff: { type: 'fixed', delay: 3000 }, removeOnComplete: 100, removeOnFail: 50 },
      );
      return { executionId: execution.id, queued: true };
    } catch {
      this.logger.warn('[Reports] Redis indisponível — executando relatório inline');
      return this.executeInline(execution.id, tenantId, template, dto);
    }
  }

  /** Execução inline (fallback sem Redis) */
  async executeInline(
    executionId: string,
    tenantId: string,
    template: ReportTemplate,
    dto: GenerateReportDto,
  ) {
    await this.executionRepo.update(executionId, { status: ExecutionStatus.PROCESSING });
    try {
      const rowLimit = ROW_LIMITS[dto.format];
      const rows = await this.queryEngine.execute(template.queryDefinition, tenantId, dto.parameters, rowLimit);

      const { buffer, mimeType, extension } = await this.exportService.generate(
        dto.format, template.columns, rows, template.name,
      );

      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      await this.executionRepo.update(executionId, {
        status: ExecutionStatus.COMPLETED, fileUrl: dataUrl,
        rowCount: rows.length, completedAt: new Date(),
      });

      this.eventEmitter.emit('reports.REPORT_GENERATED', { tenantId, executionId, rowCount: rows.length });
      return {
        executionId, queued: false, rowCount: rows.length,
        fileName: `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.${extension}`,
        mimeType, buffer: buffer.toString('base64'),
      };
    } catch (err: any) {
      await this.executionRepo.update(executionId, { status: ExecutionStatus.FAILED, errorMessage: err.message });
      this.eventEmitter.emit('reports.REPORT_FAILED', { tenantId, executionId, error: err.message });
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
