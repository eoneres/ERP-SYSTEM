import {
  IsString, IsEnum, IsOptional, IsUUID, IsNumber,
  IsDateString, IsInt, Min, Max, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LeadStage, LeadSource } from '../entities/lead.entity';
import { QuoteStatus } from '../entities/quote.entity';
import { InteractionType } from '../entities/interaction.entity';
import { PaginationDto } from '@shared/dto/pagination.dto';

// ─── Lead ─────────────────────────────────────────────────────────────────────

export class CreateLeadDto {
  @ApiProperty() @IsString() @MaxLength(200) name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) position?: string;

  @ApiPropertyOptional({ enum: LeadStage })
  @IsOptional() @IsEnum(LeadStage) stage?: LeadStage;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) estimatedValue?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional() @IsInt() @Min(0) @Max(100) @Type(() => Number) probability?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedCloseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional() @IsOptional() @IsString() lostReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) kanbanOrder?: number;
}

export class MoveLeadDto {
  @ApiProperty({ enum: LeadStage }) @IsEnum(LeadStage) stage: LeadStage;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number) kanbanOrder?: number;
}

export class ConvertLeadDto {
  @ApiPropertyOptional({ description: 'Sobrescreve o nome do cliente criado' })
  @IsOptional() @IsString() @MaxLength(200) customerName?: string;
}

export class LeadFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: LeadStage })
  @IsOptional() @IsEnum(LeadStage) stage?: LeadStage;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;

  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export class CreateQuoteDto {
  @ApiProperty() @IsUUID() leadId: string;

  @ApiPropertyOptional({ enum: QuoteStatus })
  @IsOptional() @IsEnum(QuoteStatus) status?: QuoteStatus;

  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) amount: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) discount?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}

// ─── Interaction ──────────────────────────────────────────────────────────────

export class CreateInteractionDto {
  @ApiProperty() @IsUUID() leadId: string;

  @ApiPropertyOptional({ enum: InteractionType })
  @IsOptional() @IsEnum(InteractionType) type?: InteractionType;

  @ApiProperty() @IsString() @MaxLength(255) subject: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() interactionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextActionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextActionNote?: string;
}

export class UpdateInteractionDto extends PartialType(CreateInteractionDto) {}
