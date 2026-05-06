import {
  IsString, IsNumber, IsEnum, IsOptional, IsUUID,
  IsBoolean, IsDateString, Min, Max, MaxLength, IsArray,
  ValidateNested, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CustomerType } from '../entities/customer.entity';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../entities/order.entity';
import { PaginationDto } from '@shared/dto/pagination.dto';

// ─── Customer DTOs ────────────────────────────────────────────────────────────
export class CreateCustomerDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional() @IsEnum(CustomerType) type?: CustomerType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)  document?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2)   state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)  zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CustomerFilterDto extends PaginationDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500)
  limit: number = 20;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional() @IsEnum(CustomerType) type?: CustomerType;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Order Item DTO ───────────────────────────────────────────────────────────
export class CreateOrderItemDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiProperty() @IsString() @MaxLength(255) productName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) productSku?: string;
  @ApiProperty() @IsNumber() @Min(0.001) @Type(() => Number) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Order DTOs ───────────────────────────────────────────────────────────────
export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsDateString() orderDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() deliveryDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) shipping?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}

// Confirmar pedido — valida e reserva estoque
export class ConfirmOrderDto {
  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
}

// Faturar pedido — baixa estoque + cria conta a receber
export class InvoiceOrderDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Vencimento da conta a receber (padrão: hoje)' })
  @IsOptional() @IsDateString() dueDate?: string;

  @ApiPropertyOptional({ description: 'Descrição da conta a receber' })
  @IsOptional() @IsString() description?: string;
}

// Marcar pagamento — só disponível quando INVOICED
export class MarkPaidDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number) paidAmount?: number;
}

// ─── Filter DTOs ──────────────────────────────────────────────────────────────
export class OrderFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional() @IsEnum(PaymentStatus) paymentStatus?: PaymentStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}
