import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { REPORTS_QUEUE } from './reports.service';
import { ReportTemplate } from '../entities/report-template.entity';
import { ReportExecution, ExecutionStatus, ExportFormat } from '../entities/report-execution.entity';
import { ReportQueryEngine } from './report-query.engine';
import { ReportExportService } from './report-export.service';

interface ReportJobData {
  executionId: string;
  tenantId:    string;
  templateId:  string;
  format:      ExportFormat;
  parameters:  Record<string, any>;
}

const ROW_LIMITS: Record<ExportFormat, number> = {
  [ExportFormat.CSV]:  50_000,
  [ExportFormat.XLSX]: 10_000,
  [ExportFormat.PDF]:    500,
};

@Processor(REPORTS_QUEUE)
export class ReportsProcessor {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    @InjectRepository(ReportTemplate)  private readonly templateRepo:  Repository<ReportTemplate>,
    @InjectRepository(ReportExecution) private readonly executionRepo: Repository<ReportExecution>,
    private readonly queryEngine:  ReportQueryEngine,
    private readonly exportService: ReportExportService,
  ) {}

  @Process('generate')
  async handleGenerate(job: Job<ReportJobData>) {
    const { executionId, tenantId, templateId, format, parameters } = job.data;
    this.logger.log(`[ReportsProcessor] Processando execução ${executionId}`);

    await this.executionRepo.update(executionId, { status: ExecutionStatus.PROCESSING });

    try {
      const template = await this.templateRepo.findOne({
        where: [{ id: templateId, tenantId }, { id: templateId, isSystem: true }],
      });
      if (!template) throw new Error('Template não encontrado');

      const rowLimit = ROW_LIMITS[format];
      const rows = await this.queryEngine.execute(template.queryDefinition, tenantId, parameters, rowLimit);

      const { buffer, mimeType } = await this.exportService.generate(format, template.columns, rows, template.name);

      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      await this.executionRepo.update(executionId, {
        status:      ExecutionStatus.COMPLETED,
        fileUrl:     dataUrl,
        rowCount:    rows.length,
        completedAt: new Date(),
      });

      this.logger.log(`[ReportsProcessor] Execução ${executionId} concluída — ${rows.length} linhas`);
    } catch (err: any) {
      this.logger.error(`[ReportsProcessor] Execução ${executionId} falhou: ${err.message}`);
      await this.executionRepo.update(executionId, {
        status:       ExecutionStatus.FAILED,
        errorMessage: err.message,
      });
      throw err;
    }
  }
}
