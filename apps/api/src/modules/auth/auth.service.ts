import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  AuthTokensDto,
  UserProfileDto,
} from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(v: string): boolean {
  return UUID_REGEX.test(v);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 30;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Aceita UUID direto ou slug (ex: "demo-tenant") — busca UUID real no banco
  private async resolveTenantId(raw: string | undefined): Promise<string | null> {
    if (!raw) return null;
    if (isValidUUID(raw)) return raw;

    try {
      const rows: any[] = await this.userRepository.query(
        `SELECT id FROM tenants WHERE slug = $1 AND status != 'cancelled' LIMIT 1`,
        [raw],
      );
      if (rows?.[0]?.id) return rows[0].id as string;
    } catch {
      // tabela pode não existir ainda
    }
    return null;
  }

  async login(dto: LoginDto, tenantIdHeader: string): Promise<AuthResponseDto> {
    const tenantId = await this.resolveTenantId(tenantIdHeader);

    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: dto.email });

    if (tenantId) {
      qb.andWhere('u.tenantId = :tenantId', { tenantId });
    }

    const user = await qb.getOne();

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    if (user.isLocked) {
      throw new UnauthorizedException(
        `Conta bloqueada até ${user.lockedUntil?.toLocaleString('pt-BR')}.`,
      );
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Conta inativa ou suspensa.');
    }

    const passwordValid = await user.validatePassword(dto.password);
    if (!passwordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Usa query builder para evitar erro TS de null em campos opcionais
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: () => 'NULL',
        lastLoginAt: new Date(),
        status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
      })
      .where('id = :id', { id: user.id })
      .execute();

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.eventEmitter.emit('auth.login', { userId: user.id, tenantId: user.tenantId });

    return { user: this.toProfileDto(user), tokens };
  }

  async register(dto: RegisterDto, tenantIdHeader: string): Promise<AuthResponseDto> {
    const tenantId = await this.resolveTenantId(tenantIdHeader);

    if (!tenantId) {
      throw new BadRequestException('Tenant inválido. Verifique o cabeçalho X-Tenant-ID.');
    }

    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), tenantId },
    });
    if (existing) throw new ConflictException('Este email já está cadastrado');

    const rounds = this.configService.get<number>('bcrypt.rounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role || UserRole.EMPLOYEE,
      status: UserStatus.ACTIVE,
      tenantId,
      permissions: this.getDefaultPermissions(dto.role || UserRole.EMPLOYEE),
    });

    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.eventEmitter.emit('auth.register', { userId: user.id, tenantId });

    return { user: this.toProfileDto(user), tokens };
  }

  async refreshTokens(user: User): Promise<AuthTokensDto> {
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ refreshTokenHash: () => 'NULL' })
      .where('id = :id', { id: userId })
      .execute();

    this.eventEmitter.emit('auth.logout', { userId });
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.toProfileDto(user);
  }

  private async generateTokens(user: User): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    return { accessToken, refreshToken, expiresIn: 900, tokenType: 'Bearer' };
  }

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ refreshTokenHash: hash })
      .where('id = :id', { id: userId })
      .execute();
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;

    if (attempts >= this.MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCK_DURATION_MINUTES);
      this.logger.warn(`User ${user.email} locked until ${lockUntil}`);

      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ failedLoginAttempts: attempts, lockedUntil: lockUntil })
        .where('id = :id', { id: user.id })
        .execute();
    } else {
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ failedLoginAttempts: attempts })
        .where('id = :id', { id: user.id })
        .execute();
    }
  }

  private toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      avatarUrl: user.avatarUrl,
      permissions: user.permissions,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private getDefaultPermissions(role: UserRole): string[] {
    const map: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]:  ['*'],
      [UserRole.TENANT_ADMIN]: ['users:manage','settings:manage','reports:view','finance:manage','inventory:manage','sales:manage','hr:manage'],
      [UserRole.MANAGER]:      ['reports:view','finance:view','inventory:manage','sales:manage','hr:view'],
      [UserRole.EMPLOYEE]:     ['inventory:view','sales:view'],
      [UserRole.VIEWER]:       ['reports:view'],
    };
    return map[role] || [];
  }
}
