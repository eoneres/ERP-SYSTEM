import {
  IsString, IsNumber, IsEnum, IsOptional, IsUUID,
  IsBoolean, IsDateString, Min, MaxLength, IsArray,
  ValidateNested, IsInt, IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SupplierType } from '../entities/supplier.entity';
import { PurchaseOrderStatus, PurchasePaymentMethod } from '../entities/purchase-order.entity';
import { PaginationDto } from '@shared/dto/pagination.dto';

// ─── Supplier DTOs ────────────────────────────────────────────────────────────
export class CreateSupplierDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;

  @ApiPropertyOptional({ enum: SupplierType })
  @IsOptional() @IsEnum(SupplierType) type?: SupplierType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)  document?:     string;
  @ApiPropertyOptional() @IsOptional() @IsEmail()  @MaxLength(150) email?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)  phone?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString()                 address?:      string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?:         string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2)   state?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)  zipCode?:      string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) contactName?:  string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) paymentTerms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString()                 notes?:        string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SupplierFilterDto extends PaginationDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: SupplierType })
  @IsOptional() @IsEnum(SupplierType) type?: SupplierType;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Order Item DTO ───────────────────────────────────────────────────────────
export class CreatePurchaseItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()   productId?:  string;
  @ApiProperty()         @IsString()  @MaxLength(255) productName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) productSku?: string;
  @ApiProperty()         @IsNumber()  @Min(0.001) @Type(() => Number) quantity: number;
  @ApiProperty()         @IsNumber()  @Min(0)     @Type(() => Number) unitCost: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Order DTOs ───────────────────────────────────────────────────────────────
export class CreatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;

  @ApiPropertyOptional({ enum: PurchasePaymentMethod })
  @IsOptional() @IsEnum(PurchasePaymentMethod) paymentMethod?: PurchasePaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsDateString() orderDate?:    string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?:      string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) shipping?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];
}

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

export class ConfirmPurchaseDto {
  @ApiPropertyOptional({ enum: PurchasePaymentMethod })
  @IsOptional() @IsEnum(PurchasePaymentMethod) paymentMethod?: PurchasePaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
}

export class ReceivePurchaseDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() receivedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class OrderFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID() supplierId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?:   string;
}
