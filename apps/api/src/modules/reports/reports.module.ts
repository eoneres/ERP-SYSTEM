import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportTemplate }  from './entities/report-template.entity';
import { ReportExecution } from './entities/report-execution.entity';

import { ReportQueryEngine }  from './services/report-query.engine';
import { ReportExportService } from './services/report-export.service';
import { ReportsService }     from './services/reports.service';
import { ReportsController }  from './controllers/reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReportTemplate, ReportExecution])],
  controllers: [ReportsController],
  providers: [ReportsService, ReportQueryEngine, ReportExportService],
  exports: [ReportsService],
})
export class ReportsModule {}
