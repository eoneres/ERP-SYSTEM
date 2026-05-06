import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Supplier }           from './entities/supplier.entity';
import { PurchaseOrder }      from './entities/purchase-order.entity';
import { PurchaseOrderItem }  from './entities/purchase-order-item.entity';

import { PurchasesService }   from './services/purchases.service';
import {
  SuppliersController,
  PurchaseOrdersController,
  PurchasesDashboardController,
} from './controllers/purchases.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, PurchaseOrder, PurchaseOrderItem])],
  controllers: [SuppliersController, PurchaseOrdersController, PurchasesDashboardController],
  providers:   [PurchasesService],
  exports:     [PurchasesService],
})
export class PurchasesModule {}
