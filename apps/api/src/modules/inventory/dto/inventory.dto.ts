import {
  IsString, IsNumber, IsInt, IsEnum, IsOptional, IsUUID,
  IsBoolean, Min, Max, MaxLength, IsDateString, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProductStatus, ProductUnit } from '../entities/product.entity';
import { MovementType, MovementReason } from '../entities/stock-movement.entity';
import { PaginationDto } from '@shared/dto/pagination.dto';

// ─── Product DTOs ─────────────────────────────────────────────────────────────
export class CreateProductDto {
  @ApiProperty() @IsString() @MaxLength(255) name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) brand?: string;

  @ApiPropertyOptional({ enum: ProductUnit })
  @IsOptional() @IsEnum(ProductUnit) unit?: ProductUnit;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) salePrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) stockQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) maxStock?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

// ─── Warehouse DTOs ───────────────────────────────────────────────────────────
export class CreateWarehouseDto {
  @ApiProperty() @IsString() @MaxLength(150) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2)   state?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Movement DTOs ────────────────────────────────────────────────────────────
export class CreateMovementDto {
  @ApiProperty() @IsUUID() productId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() destinationWarehouseId?: string;

  @ApiProperty({ enum: MovementType }) @IsEnum(MovementType) type: MovementType;

  @ApiPropertyOptional({ enum: MovementReason })
  @IsOptional() @IsEnum(MovementReason) reason?: MovementReason;

  @ApiProperty() @IsNumber() @Min(0.001) @Type(() => Number) quantity: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() movementDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) counterpartName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ─── Filter DTOs ──────────────────────────────────────────────────────────────

// ProductFilterDto sobrescreve o @Max(100) do PaginationDto para permitir
// buscas internas com limit maior (ex: popular selects no frontend).
export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;

  @ApiPropertyOptional({ description: 'Filtrar produtos com estoque abaixo do mínimo' })
  @IsOptional() lowStock?: boolean;
}

export class MovementFilterDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() warehouseId?: string;
  @ApiPropertyOptional({ enum: MovementType }) @IsOptional() @IsEnum(MovementType) type?: MovementType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}
