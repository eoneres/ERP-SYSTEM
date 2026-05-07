import {
  IsString, IsEnum, IsOptional, IsUUID, IsNumber,
  IsBoolean, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DocumentType } from '../entities/invoice-series.entity';
import { PaginationDto } from '@shared/dto/pagination.dto';

// ─── InvoiceSeries ────────────────────────────────────────────────────────────

export class CreateInvoiceSeriesDto {
  @ApiProperty({ example: 'A' }) @IsString() @MaxLength(10) series: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional() @IsEnum(DocumentType) documentType?: DocumentType;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateInvoiceSeriesDto extends PartialType(CreateInvoiceSeriesDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── FiscalDocument ───────────────────────────────────────────────────────────

export class IssueFiscalDocumentDto {
  @ApiProperty() @IsUUID() seriesId: string;

  @ApiPropertyOptional({ description: 'ID do pedido de venda associado' })
  @IsOptional() @IsUUID() orderId?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) totalAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)  recipientDocument?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class FiscalDocumentFilterDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() seriesId?: string;
}
