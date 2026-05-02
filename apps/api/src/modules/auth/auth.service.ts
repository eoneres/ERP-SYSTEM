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

// UUID v4 regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
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

  // ─── Resolve tenant ID ────────────────────────────────────────────────────
  // Se o header tiver um slug como "demo-tenant" ao invés de UUID,
  // busca o UUID real na tabela tenants. Isso suporta tanto UUID direto
  // quanto slug amigável no X-Tenant-ID.
  private async resolveTenantId(tenantIdOrSlug: string | undefined): Promise<string | null> {
    if (!tenantIdOrSlug) return null;

    // Já é um UUID válido — usa diretamente
    if (isValidUUID(tenantIdOrSlug)) return tenantIdOrSlug;

    // É um slug — busca o UUID real
    try {
      const rows = await this.userRepository.query(
        `SELECT id FROM tenants WHERE slug = $1 AND status != 'cancelled' LIMIT 1`,
        [tenantIdOrSlug],
      );
      if (rows?.[0]?.id) {
        this.logger.debug(`Resolved tenant slug '${tenantIdOrSlug}' → ${rows[0].id}`);
        return rows[0].id;
      }
    } catch (err) {
      // Tabela pode não existir ainda em ambiente de desenvolvimento inicial
      this.logger.warn(`Could not resolve tenant slug '${tenantIdOrSlug}': ${err}`);
    }

    return null;
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, tenantIdHeader: string): Promise<AuthResponseDto> {
    const tenantId = await this.resolveTenantId(tenantIdHeader);

    // Busca o usuário — filtra por tenantId apenas se tiver um UUID válido
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: dto.email });

    if (tenantId) {
      qb.andWhere('u.tenantId = :tenantId', { tenantId });
    }

    const user = await qb.getOne();

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.isLocked) {
      throw new UnauthorizedException(
        `Conta bloqueada até ${user.lockedUntil?.toLocaleString('pt-BR')}. Tente novamente mais tarde.`,
      );
    }

    if (
      user.status === UserStatus.INACTIVE ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException(
        'Conta inativa ou suspensa. Contate o administrador.',
      );
    }

    const passwordValid = await user.validatePassword(dto.password);

    if (!passwordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Reset tentativas falhas após login bem-sucedido
    await this.userRepository.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      status:
        user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
    });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.eventEmitter.emit('auth.login', {
      userId: user.id,
      tenantId: user.tenantId,
    });

    return {
      user: this.toProfileDto(user),
      tokens,
    };
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto, tenantIdHeader: string): Promise<AuthResponseDto> {
    const tenantId = await this.resolveTenantId(tenantIdHeader);

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant inválido. Verifique o cabeçalho X-Tenant-ID.',
      );
    }

    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), tenantId },
    });

    if (existing) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const bcryptRounds = this.configService.get<number>('bcrypt.rounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

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

    return {
      user: this.toProfileDto(user),
      tokens,
    };
  }

  // ─── Refresh tokens ───────────────────────────────────────────────────────
  async refreshTokens(user: User): Promise<AuthTokensDto> {
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash: null });
    this.eventEmitter.emit('auth.logout', { userId });
  }

  // ─── Get profile ──────────────────────────────────────────────────────────
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.toProfileDto(user);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────
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
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      tokenType: 'Bearer',
    };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const newAttempts = user.failedLoginAttempts + 1;
    const update: Partial<User> = { failedLoginAttempts: newAttempts };

    if (newAttempts >= this.MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + this.LOCK_DURATION_MINUTES);
      update.lockedUntil = lockUntil;
      this.logger.warn(`User ${user.email} locked until ${lockUntil}`);
    }

    await this.userRepository.update(user.id, update);
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
    const permissionMap: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.TENANT_ADMIN]: [
        'users:manage', 'settings:manage', 'reports:view',
        'finance:manage', 'inventory:manage', 'sales:manage', 'hr:manage',
      ],
      [UserRole.MANAGER]: [
        'reports:view', 'finance:view',
        'inventory:manage', 'sales:manage', 'hr:view',
      ],
      [UserRole.EMPLOYEE]: ['inventory:view', 'sales:view'],
      [UserRole.VIEWER]: ['reports:view'],
    };
    return permissionMap[role] || [];
  }
}
