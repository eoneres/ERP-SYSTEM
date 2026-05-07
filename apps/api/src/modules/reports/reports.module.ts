import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { ReportTemplate }  from './entities/report-template.entity';
import { ReportExecution } from './entities/report-execution.entity';

import { ReportQueryEngine }  from './services/report-query.engine';
import { ReportExportService } from './services/report-export.service';
import { ReportsService, REPORTS_QUEUE } from './services/reports.service';
import { ReportsProcessor }   from './services/reports.processor';
import { ReportsController }  from './controllers/reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTemplate, ReportExecution]),
    BullModule.registerQueue({ name: REPORTS_QUEUE }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor, ReportQueryEngine, ReportExportService],
  exports: [ReportsService],
})
export class ReportsModule {}
