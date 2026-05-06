import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './entities/product.entity';
import { Warehouse } from './entities/warehouse.entity';
import { StockMovement } from './entities/stock-movement.entity';

import { InventoryService } from './services/inventory.service';
import {
  ProductsController,
  WarehousesController,
  MovementsController,
  InventoryDashboardController,
} from './controllers/inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Warehouse, StockMovement])],
  controllers: [
    ProductsController,
    WarehousesController,
    MovementsController,
    InventoryDashboardController,
  ],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
