import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger, Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcryptjs';

import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { Payroll, PayrollStatus } from '../entities/payroll.entity';
import { TimeRecord } from '../entities/time-record.entity';
import {
  CreateEmployeeDto, UpdateEmployeeDto, EmployeeFilterDto,
  CreateSystemUserDto, UpdateSystemUserDto, UserFilterDto,
  CreatePayrollDto, UpdatePayrollDto, PayrollFilterDto,
  CreateTimeRecordDto, CheckOutDto, TimeRecordFilterDto,
} from '../dto/hr.dto';

import { User, UserRole, UserStatus } from '@modules/auth/entities/user.entity';
import { ROLE_PERMISSIONS } from '@shared/permissions';

// Tabela de INSS 2024 (simplificada)
const INSS_TABLE = [
  { max: 1412.00,  rate: 0.075 },
  { max: 2666.68,  rate: 0.09  },
  { max: 4000.03,  rate: 0.12  },
  { max: 7786.02,  rate: 0.14  },
];

function calcINSS(salary: number): number {
  let inss = 0;
  let prev = 0;
  for (const bracket of INSS_TABLE) {
    if (salary <= bracket.max) {
      inss += (salary - prev) * bracket.rate;
      break;
    }
    inss += (bracket.max - prev) * bracket.rate;
    prev = bracket.max;
  }
  return Math.round(inss * 100) / 100;
}

function calcIRRF(base: number): number {
  if (base <= 2259.20) return 0;
  if (base <= 2826.65) return Math.round((base * 0.075 - 169.44) * 100) / 100;
  if (base <= 3751.05) return Math.round((base * 0.15  - 381.44) * 100) / 100;
  if (base <= 4664.68) return Math.round((base * 0.225 - 662.77) * 100) / 100;
  return Math.round((base * 0.275 - 896.00) * 100) / 100;
}

@Injectable()
export class HRService {
  private readonly logger = new Logger(HRService.name);

  constructor(
    @InjectRepository(Employee)   private readonly employeeRepo:   Repository<Employee>,
    @InjectRepository(Payroll)    private readonly payrollRepo:    Repository<Payroll>,
    @InjectRepository(TimeRecord) private readonly timeRecordRepo: Repository<TimeRecord>,
    @InjectRepository(User)       private readonly userRepo:       Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private ck(tenantId: string, s: string) { return `hr:${tenantId}:${s}`; }
  private async bust(tenantId: string, ...keys: string[]) {
    await Promise.all(keys.map((k) => this.cache.del(this.ck(tenantId, k))));
  }

  // ─── Employees ──────────────────────────────────────────────────────────────

  async getEmployees(tenantId: string, filter: EmployeeFilterDto) {
    const { page, limit, search, sortBy, sortOrder, status, department, employmentType } = filter;

    const qb = this.employeeRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.deletedAt IS NULL');

    if (search) qb.andWhere('(e.fullName ILIKE :s OR e.document ILIKE :s OR e.email ILIKE :s OR e.position ILIKE :s)', { s: `%${search}%` });
    if (status)         qb.andWhere('e.status = :status',                 { status });
    if (department)     qb.andWhere('e.department ILIKE :dept',           { dept: `%${department}%` });
    if (employmentType) qb.andWhere('e.employmentType = :employmentType', { employmentType });

    const sortMap: Record<string, string> = {
      fullName: 'e.fullName', hireDate: 'e.hireDate', salary: 'e.salary', createdAt: 'e.createdAt',
    };
    qb.orderBy(sortMap[sortBy ?? ''] ?? 'e.fullName', sortOrder ?? 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getEmployee(id: string, tenantId: string) {
    const e = await this.employeeRepo.findOne({ where: { id, tenantId } });
    if (!e) throw new NotFoundException('Colaborador não encontrado');
    return e;
  }

  async createEmployee(tenantId: string, userId: string, dto: CreateEmployeeDto) {
    if (dto.document) {
      const exists = await this.employeeRepo.findOne({ where: { document: dto.document, tenantId } });
      if (exists) throw new ConflictException(`CPF '${dto.document}' já cadastrado`);
    }

    const employee = this.employeeRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      hireDate:  new Date(dto.hireDate),
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      status:    EmployeeStatus.ACTIVE,
    });

    const saved = await this.employeeRepo.save(employee);
    this.eventEmitter.emit('hr.EMPLOYEE_CREATED', { tenantId, employeeId: saved.id });
    await this.bust(tenantId, 'summary');
    return saved;
  }

  async updateEmployee(id: string, tenantId: string, userId: string, dto: UpdateEmployeeDto) {
    const employee = await this.getEmployee(id, tenantId);

    if (dto.document && dto.document !== employee.document) {
      const exists = await this.employeeRepo.findOne({ where: { document: dto.document, tenantId } });
      if (exists) throw new ConflictException(`CPF '${dto.document}' já cadastrado`);
    }

    Object.assign(employee, {
      ...dto,
      updatedBy:       userId,
      hireDate:        dto.hireDate        ? new Date(dto.hireDate)        : employee.hireDate,
      birthDate:       dto.birthDate       ? new Date(dto.birthDate)       : employee.birthDate,
      terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : employee.terminationDate,
    });

    const saved = await this.employeeRepo.save(employee);
    await this.bust(tenantId, 'summary');
    return saved;
  }

  async deleteEmployee(id: string, tenantId: string) {
    const employee = await this.getEmployee(id, tenantId);
    await this.employeeRepo.softRemove(employee);
    await this.bust(tenantId, 'summary');
  }

  async getDepartments(tenantId: string): Promise<string[]> {
    const result = await this.employeeRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.department', 'department')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.department IS NOT NULL')
      .andWhere('e.deletedAt IS NULL')
      .getRawMany();
    return result.map((r) => r.department).filter(Boolean).sort();
  }

  // ─── System Users Management ─────────────────────────────────────────────────

  async getUsers(tenantId: string, filter: UserFilterDto) {
    const { page, limit, search, sortBy, sortOrder, role, isActive } = filter;

    const qb = this.userRepo.createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.deletedAt IS NULL');

    if (search) qb.andWhere('(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)', { s: `%${search}%` });
    if (role)   qb.andWhere('u.role = :role', { role });
    if (isActive !== undefined) {
      qb.andWhere('u.status = :status', { status: isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE });
    }

    const sortMap: Record<string, string> = {
      firstName: 'u.firstName', email: 'u.email', lastLoginAt: 'u.lastLoginAt', createdAt: 'u.createdAt',
    };
    qb.orderBy(sortMap[sortBy ?? ''] ?? 'u.firstName', sortOrder ?? 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    // Remove passwordHash do retorno
    return {
      items: items.map((u) => this.sanitizeUser(u)),
      total,
    };
  }

  async getUser(id: string, tenantId: string) {
    const u = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    return this.sanitizeUser(u);
  }

  async createSystemUser(tenantId: string, createdBy: string, dto: CreateSystemUserDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase(), tenantId } });
    if (exists) throw new ConflictException(`E-mail '${dto.email}' já está em uso`);

    if (dto.employeeId) {
      const emp = await this.employeeRepo.findOne({ where: { id: dto.employeeId, tenantId } });
      if (!emp) throw new BadRequestException('Colaborador não encontrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = dto.role ?? UserRole.EMPLOYEE;

    const user = this.userRepo.create({
      firstName:   dto.firstName,
      lastName:    dto.lastName,
      email:       dto.email.toLowerCase(),
      passwordHash,
      role,
      status:      UserStatus.ACTIVE,
      tenantId,
      createdBy,
      permissions: dto.permissions ?? this.defaultPermissions(role),
    });

    const saved = await this.userRepo.save(user);

    // Vincula colaborador ao usuário criado
    if (dto.employeeId) {
      await this.employeeRepo.update({ id: dto.employeeId, tenantId }, { userId: saved.id });
    }

    this.eventEmitter.emit('hr.USER_CREATED', { tenantId, userId: saved.id, createdBy });
    return this.sanitizeUser(saved);
  }

  async updateSystemUser(id: string, tenantId: string, updatedBy: string, dto: UpdateSystemUserDto) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (dto.role)        user.role        = dto.role;
    if (dto.firstName)   user.firstName   = dto.firstName;
    if (dto.lastName)    user.lastName    = dto.lastName;
    if (dto.permissions) user.permissions = dto.permissions;
    if (dto.isActive !== undefined) {
      user.status = dto.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    }
    (user as any).updatedBy = updatedBy;

    if (dto.employeeId) {
      const emp = await this.employeeRepo.findOne({ where: { id: dto.employeeId, tenantId } });
      if (!emp) throw new BadRequestException('Colaborador não encontrado');
      await this.employeeRepo.update({ id: dto.employeeId, tenantId }, { userId: id });
    }

    const saved = await this.userRepo.save(user);
    this.eventEmitter.emit('hr.ROLE_ASSIGNED', { tenantId, userId: id, role: dto.role });
    return this.sanitizeUser(saved);
  }

  async toggleUserStatus(id: string, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    user.status = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    return this.sanitizeUser(await this.userRepo.save(user));
  }

  async updateUserPermissions(id: string, tenantId: string, permissions: string[]) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    user.permissions = permissions;
    return this.sanitizeUser(await this.userRepo.save(user));
  }

  // ─── Payroll ─────────────────────────────────────────────────────────────────

  async getPayrolls(tenantId: string, filter: PayrollFilterDto) {
    const { page, limit, employeeId, referenceMonth, status } = filter;

    const qb = this.payrollRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.employee', 'employee')
      .where('p.tenantId = :tenantId', { tenantId });

    if (employeeId)     qb.andWhere('p.employeeId = :employeeId',         { employeeId });
    if (referenceMonth) qb.andWhere('p.referenceMonth = :referenceMonth', { referenceMonth });
    if (status)         qb.andWhere('p.status = :status',                 { status });

    qb.orderBy('p.referenceMonth', 'DESC').addOrderBy('employee.fullName', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async createPayroll(tenantId: string, userId: string, dto: CreatePayrollDto) {
    const employee = await this.getEmployee(dto.employeeId, tenantId);

    const exists = await this.payrollRepo.findOne({
      where: { employeeId: dto.employeeId, referenceMonth: dto.referenceMonth, tenantId },
    });
    if (exists) throw new ConflictException(`Folha de ${dto.referenceMonth} já existe para este colaborador`);

    const baseSalary  = dto.baseSalary ?? Number(employee.salary);
    const workedDays  = dto.workedDays ?? 30;
    const prorated    = baseSalary * (workedDays / 30);
    const bonuses     = dto.bonuses ?? 0;
    const deductions  = dto.deductions ?? 0;
    const inss        = calcINSS(prorated);
    const irrf        = calcIRRF(prorated - inss);
    const fgts        = Math.round(prorated * 0.08 * 100) / 100;
    const netSalary   = prorated + bonuses - deductions - inss - irrf;

    const payroll = this.payrollRepo.create({
      tenantId, createdBy: userId,
      employeeId:     dto.employeeId,
      referenceMonth: dto.referenceMonth,
      baseSalary,
      bonuses,
      deductions,
      inssDeduction:  inss,
      irrfDeduction:  irrf,
      fgtsAmount:     fgts,
      netSalary:      Math.max(0, netSalary),
      workedDays,
      status:         PayrollStatus.DRAFT,
      notes:          dto.notes,
    });

    return this.payrollRepo.save(payroll);
  }

  async updatePayroll(id: string, tenantId: string, userId: string, dto: UpdatePayrollDto) {
    const payroll = await this.payrollRepo.findOne({ where: { id, tenantId } });
    if (!payroll) throw new NotFoundException('Folha não encontrada');
    if (payroll.status === PayrollStatus.PAID) throw new BadRequestException('Folha já paga não pode ser alterada');

    Object.assign(payroll, {
      ...dto,
      updatedBy:   userId,
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : payroll.paymentDate,
    });

    // Recalcula líquido se valores mudaram
    if (dto.baseSalary || dto.bonuses !== undefined || dto.deductions !== undefined || dto.workedDays) {
      const base     = Number(payroll.baseSalary);
      const days     = payroll.workedDays;
      const prorated = base * (days / 30);
      const inss     = calcINSS(prorated);
      const irrf     = calcIRRF(prorated - inss);
      payroll.inssDeduction = inss;
      payroll.irrfDeduction = irrf;
      payroll.fgtsAmount    = Math.round(prorated * 0.08 * 100) / 100;
      payroll.netSalary     = Math.max(0, prorated + Number(payroll.bonuses) - Number(payroll.deductions) - inss - irrf);
    }

    return this.payrollRepo.save(payroll);
  }

  // ─── Time Records ────────────────────────────────────────────────────────────

  async getTimeRecords(tenantId: string, filter: TimeRecordFilterDto) {
    const { page, limit, employeeId, dateFrom, dateTo } = filter;

    const qb = this.timeRecordRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.employee', 'employee')
      .where('t.tenantId = :tenantId', { tenantId });

    if (employeeId) qb.andWhere('t.employeeId = :employeeId', { employeeId });
    if (dateFrom)   qb.andWhere('t.checkIn >= :dateFrom',     { dateFrom });
    if (dateTo)     qb.andWhere('t.checkIn <= :dateTo',       { dateTo });

    qb.orderBy('t.checkIn', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async createTimeRecord(tenantId: string, userId: string, dto: CreateTimeRecordDto) {
    await this.getEmployee(dto.employeeId, tenantId);

    const checkIn  = new Date(dto.checkIn);
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : undefined;
    const minutes  = checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000) : undefined;

    const record = this.timeRecordRepo.create({
      tenantId, createdBy: userId,
      employeeId:    dto.employeeId,
      checkIn,
      checkOut,
      type:          dto.type,
      minutesWorked: minutes,
      notes:         dto.notes,
    });

    return this.timeRecordRepo.save(record);
  }

  async checkOut(id: string, tenantId: string, dto: CheckOutDto) {
    const record = await this.timeRecordRepo.findOne({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('Registro não encontrado');
    if (record.checkOut) throw new BadRequestException('Checkout já registrado');

    record.checkOut      = new Date(dto.checkOut);
    record.minutesWorked = Math.round((record.checkOut.getTime() - record.checkIn.getTime()) / 60000);

    return this.timeRecordRepo.save(record);
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getSummary(tenantId: string) {
    const cacheKey = this.ck(tenantId, 'summary');
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [totalEmployees, activeEmployees, totalUsers, payrollThisMonth] = await Promise.all([
      this.employeeRepo.count({ where: { tenantId } }),
      this.employeeRepo.count({ where: { tenantId, status: EmployeeStatus.ACTIVE } }),
      this.userRepo.count({ where: { tenantId, status: UserStatus.ACTIVE } }),
      this.payrollRepo
        .createQueryBuilder('p')
        .select('SUM(p.netSalary)', 'total')
        .where('p.tenantId = :tenantId', { tenantId })
        .andWhere(`p.referenceMonth = TO_CHAR(NOW(), 'YYYY-MM')`)
        .andWhere('p.status != :s', { s: PayrollStatus.CANCELLED })
        .getRawOne(),
    ]);

    const summary = {
      totalEmployees,
      activeEmployees,
      totalUsers,
      payrollThisMonth: Number(payrollThisMonth?.total ?? 0),
    };

    await this.cache.set(cacheKey, summary, 60 * 5 * 1000);
    return summary;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private sanitizeUser(user: User) {
    const { passwordHash, refreshTokenHash, ...safe } = user as any;
    return safe;
  }

  private defaultPermissions(role: UserRole): string[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }
}
