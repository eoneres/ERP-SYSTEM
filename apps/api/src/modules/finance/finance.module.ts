import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Category } from './entities/category.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionRepository } from './repositories/transaction.repository';
import { FinanceService } from './services/finance.service';
import {
  AccountsController,
  CategoriesController,
  TransactionsController,
  FinanceDashboardController,
} from './controllers/finance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Category, Transaction])],
  controllers: [
    AccountsController,
    CategoriesController,
    TransactionsController,
    FinanceDashboardController,
  ],
  providers: [FinanceService, TransactionRepository],
  exports: [FinanceService],
})
export class FinanceModule {}
