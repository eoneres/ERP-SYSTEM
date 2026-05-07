import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvoiceSeries }  from './entities/invoice-series.entity';
import { FiscalDocument } from './entities/fiscal-document.entity';

import { FiscalService } from './services/fiscal.service';
import { InvoiceSeriesController, FiscalDocumentsController } from './controllers/fiscal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceSeries, FiscalDocument])],
  controllers: [InvoiceSeriesController, FiscalDocumentsController],
  providers: [FiscalService],
  exports: [FiscalService],
})
export class FiscalModule {}
