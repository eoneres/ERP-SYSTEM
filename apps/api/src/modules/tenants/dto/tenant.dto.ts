import {
  IsString, IsOptional, IsEmail, IsBoolean,
  IsObject, MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() street?:       string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?:       string;
  @ApiPropertyOptional() @IsOptional() @IsString() complement?:   string;
  @ApiPropertyOptional() @IsOptional() @IsString() neighborhood?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?:         string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2)  state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?:      string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?:      string;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) tradeName?:   string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)  cnpj?:        string;
  @ApiPropertyOptional() @IsOptional() @IsEmail()  @MaxLength(255) email?:       string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)  phone?:       string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional() @ValidateNested() @Type(() => AddressDto)
  address?: AddressDto;
}

export class UpdateBrandingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(7)   primaryColor?:   string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(7)   secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) fontFamily?:     string;
  @ApiPropertyOptional() @IsOptional() @IsString()                 customCss?:      string;
  @ApiPropertyOptional() @IsOptional() @IsString()                 logoUrl?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString()                 faviconUrl?:     string;
}

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)  currency?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)  language?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)  timezone?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)  dateFormat?:      string;
}

export class UpdateFeatureFlagsDto {
  @ApiPropertyOptional() @IsOptional() @IsObject()
  featureFlags?: Record<string, boolean>;
}
