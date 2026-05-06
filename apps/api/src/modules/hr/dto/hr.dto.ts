import {
  IsString, IsNumber, IsEnum, IsOptional, IsUUID,
  IsBoolean, IsDateString, Min, Max, MaxLength, IsEmail, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EmployeeStatus, EmploymentType } from '../entities/employee.entity';
import { PayrollStatus } from '../entities/payroll.entity';
import { TimeRecordType } from '../entities/time-record.entity';
import { PaginationDto } from '@shared/dto/pagination.dto';
import { UserRole } from '@modules/auth/entities/user.entity';

// ─── Employee DTOs ────────────────────────────────────────────────────────────
export class CreateEmployeeDto {
  @ApiProperty() @IsString() @MaxLength(200) fullName: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) document?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;

  @ApiProperty() @IsDateString() hireDate: string;

  @ApiProperty() @IsString() @MaxLength(150) position: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) department?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) salary?: number;

  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(150) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2)   state?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;

  @ApiPropertyOptional() @IsOptional() @IsDateString() terminationDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
}

export class EmployeeFilterDto extends PaginationDto {
  // Sobrescreve @Max(100) do PaginationDto para permitir busca interna (selects)
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500)
  limit: number = 20;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
}

// ─── User Management DTOs ─────────────────────────────────────────────────────
export class CreateSystemUserDto {
  @ApiProperty() @IsString() @MaxLength(100) firstName: string;
  @ApiProperty() @IsString() @MaxLength(100) lastName: string;
  @ApiProperty() @IsEmail() email: string;

  @ApiProperty() @IsString() password: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional() @IsEnum(UserRole) role?: UserRole;

  @ApiPropertyOptional() @IsOptional() @IsUUID() employeeId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Lista de permissões customizadas' })
  @IsOptional() @IsString({ each: true }) permissions?: string[];
}

export class UpdateSystemUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional() @IsEnum(UserRole) role?: UserRole;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsString({ each: true }) permissions?: string[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() employeeId?: string;
}

export class UserFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional() @IsEnum(UserRole) role?: UserRole;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Payroll DTOs ─────────────────────────────────────────────────────────────
export class CreatePayrollDto {
  @ApiProperty() @IsUUID() employeeId: string;
  @ApiProperty({ description: 'YYYY-MM' }) @IsString() referenceMonth: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) baseSalary?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) bonuses?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) deductions?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(31) @Type(() => Number) workedDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdatePayrollDto extends PartialType(CreatePayrollDto) {
  @ApiPropertyOptional({ enum: PayrollStatus })
  @IsOptional() @IsEnum(PayrollStatus) status?: PayrollStatus;

  @ApiPropertyOptional() @IsOptional() @IsDateString() paymentDate?: string;
}

export class PayrollFilterDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceMonth?: string;
  @ApiPropertyOptional({ enum: PayrollStatus }) @IsOptional() @IsEnum(PayrollStatus) status?: PayrollStatus;
}

// ─── Time Record DTOs ─────────────────────────────────────────────────────────
export class CreateTimeRecordDto {
  @ApiProperty() @IsUUID() employeeId: string;
  @ApiProperty() @IsDateString() checkIn: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkOut?: string;

  @ApiPropertyOptional({ enum: TimeRecordType })
  @IsOptional() @IsEnum(TimeRecordType) type?: TimeRecordType;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CheckOutDto {
  @ApiProperty() @IsDateString() checkOut: string;
}

export class TimeRecordFilterDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}
