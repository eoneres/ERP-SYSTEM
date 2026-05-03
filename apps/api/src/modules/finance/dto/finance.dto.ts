import {
  IsString, IsNumber, IsEnum, IsOptional, IsUUID, ValidateIf,
  IsDateString, IsArray, IsBoolean, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TransactionType, TransactionStatus, RecurrenceType } from '../entities/transaction.entity';
import { AccountType } from '../entities/account.entity';
import { CategoryType } from '../entities/category.entity';
import { PaginationDto } from '@shared/dto/pagination.dto';

// ─── Account DTOs ─────────────────────────────────────────────────────────────
export class CreateAccountDto {
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiPropertyOptional({ enum: AccountType }) @IsOptional() @IsEnum(AccountType) type?: AccountType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) initialBalance?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bankName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() agencyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateAccountDto extends PartialType(CreateAccountDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Category DTOs ────────────────────────────────────────────────────────────
export class CreateCategoryDto {
  @ApiProperty() @IsString() @MaxLength(100) name: string;
  @ApiProperty({ enum: CategoryType }) @IsEnum(CategoryType) type: CategoryType;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Transaction DTOs ─────────────────────────────────────────────────────────
export class CreateTransactionDto {
  @ApiProperty() @IsString() @MaxLength(255) description: string;

  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: TransactionType }) @IsEnum(TransactionType) type: TransactionType;

  @ApiProperty() @IsDateString() dueDate: string;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus;

  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  paidAmount?: number;

  @ApiPropertyOptional() @IsOptional() @ValidateIf((o) => o.accountId !== '' && o.accountId !== null) @IsUUID() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((o) => o.categoryId !== '' && o.categoryId !== null) @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() destinationAccountId?: string;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @IsOptional() @IsEnum(RecurrenceType) recurrence?: RecurrenceType;

  @ApiPropertyOptional() @IsOptional() @IsDateString() recurrenceEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() counterpartName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() counterpartDocument?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class PayTransactionDto {
  @ApiProperty() @IsDateString() paymentDate: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number) paidAmount?: number;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((o) => o.accountId !== '' && o.accountId !== null) @IsUUID() accountId?: string;
}

// ─── Filter / Query DTOs ──────────────────────────────────────────────────────
export class TransactionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional() @IsEnum(TransactionType) type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional() @IsEnum(TransactionStatus) status?: TransactionStatus;

  @ApiPropertyOptional() @IsOptional() @ValidateIf((o) => o.accountId !== '' && o.accountId !== null) @IsUUID() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((o) => o.categoryId !== '' && o.categoryId !== null) @IsUUID() categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) amountMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) amountMax?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() tags?: string;
}

// ─── Dashboard / Summary DTOs ─────────────────────────────────────────────────
export class FinanceSummaryDto {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  pendingIncome: number;
  pendingExpense: number;
  overdueCount: number;
  overdueAmount: number;
  accountsBalance: number;
}

export class CashFlowItemDto {
  date: string;
  income: number;
  expense: number;
  balance: number;
  accumulated: number;
}
