import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HRService } from '../services/hr.service';
import {
  CreateEmployeeDto, UpdateEmployeeDto, EmployeeFilterDto,
  CreateSystemUserDto, UpdateSystemUserDto, UserFilterDto,
  CreatePayrollDto, UpdatePayrollDto, PayrollFilterDto,
  CreateTimeRecordDto, CheckOutDto, TimeRecordFilterDto,
} from '../dto/hr.dto';
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';

// ─── Employees ────────────────────────────────────────────────────────────────
@ApiTags('HR - Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly svc: HRService) {}

  @Get()
  @ApiOperation({ summary: 'Listar colaboradores' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: EmployeeFilterDto) {
    const { items, total } = await this.svc.getEmployees(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Listar departamentos' })
  async getDepartments(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getDepartments(tenantId));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getEmployee(id, tenantId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar colaborador' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateEmployeeDto) {
    return ApiResponse.ok(await this.svc.createEmployee(tenantId, userId, dto), 'Colaborador criado');
  }

  @Put(':id')
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateEmployeeDto) {
    return ApiResponse.ok(await this.svc.updateEmployee(id, tenantId, userId, dto), 'Colaborador atualizado');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteEmployee(id, tenantId);
  }
}

// ─── System Users ─────────────────────────────────────────────────────────────
@ApiTags('HR - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/users')
export class HRUsersController {
  constructor(private readonly svc: HRService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuários do sistema' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: UserFilterDto) {
    const { items, total } = await this.svc.getUsers(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getUser(id, tenantId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar usuário do sistema' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateSystemUserDto) {
    return ApiResponse.ok(await this.svc.createSystemUser(tenantId, userId, dto), 'Usuário criado');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar usuário (role, permissões, status)' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateSystemUserDto) {
    return ApiResponse.ok(await this.svc.updateSystemUser(id, tenantId, userId, dto), 'Usuário atualizado');
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Ativar / desativar usuário' })
  async toggleStatus(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.toggleUserStatus(id, tenantId));
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Atualizar permissões do usuário' })
  async updatePermissions(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @Body('permissions') permissions: string[],
  ) {
    return ApiResponse.ok(await this.svc.updateUserPermissions(id, tenantId, permissions), 'Permissões atualizadas');
  }
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
@ApiTags('HR - Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/payroll')
export class PayrollController {
  constructor(private readonly svc: HRService) {}

  @Get()
  @ApiOperation({ summary: 'Listar folhas de pagamento' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: PayrollFilterDto) {
    const { items, total } = await this.svc.getPayrolls(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Post()
  @ApiOperation({ summary: 'Gerar folha de pagamento' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreatePayrollDto) {
    return ApiResponse.ok(await this.svc.createPayroll(tenantId, userId, dto), 'Folha gerada');
  }

  @Put(':id')
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdatePayrollDto) {
    return ApiResponse.ok(await this.svc.updatePayroll(id, tenantId, userId, dto), 'Folha atualizada');
  }
}

// ─── Time Records ─────────────────────────────────────────────────────────────
@ApiTags('HR - Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly svc: HRService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de ponto' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: TimeRecordFilterDto) {
    const { items, total } = await this.svc.getTimeRecords(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar ponto (check-in)' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateTimeRecordDto) {
    return ApiResponse.ok(await this.svc.createTimeRecord(tenantId, userId, dto), 'Ponto registrado');
  }

  @Patch(':id/checkout')
  @ApiOperation({ summary: 'Registrar saída (check-out)' })
  async checkOut(@Param('id') id: string, @CurrentTenantId() tenantId: string, @Body() dto: CheckOutDto) {
    return ApiResponse.ok(await this.svc.checkOut(id, tenantId, dto), 'Saída registrada');
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
@ApiTags('HR - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr/dashboard')
export class HRDashboardController {
  constructor(private readonly svc: HRService) {}

  @Get('summary')
  async getSummary(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSummary(tenantId));
  }
}
