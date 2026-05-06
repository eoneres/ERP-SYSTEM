import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Customer }  from './entities/customer.entity';
import { Order }     from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

import { SalesService } from './services/sales.service';
import {
  CustomersController,
  OrdersController,
  SalesDashboardController,
} from './controllers/sales.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order, OrderItem])],
  controllers: [CustomersController, OrdersController, SalesDashboardController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
