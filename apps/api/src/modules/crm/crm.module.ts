import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Lead }        from './entities/lead.entity';
import { Quote }       from './entities/quote.entity';
import { Interaction } from './entities/interaction.entity';

import { CrmService } from './services/crm.service';
import {
  LeadsController,
  QuotesController,
  InteractionsController,
  CrmDashboardController,
} from './controllers/crm.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Quote, Interaction])],
  controllers: [LeadsController, QuotesController, InteractionsController, CrmDashboardController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
