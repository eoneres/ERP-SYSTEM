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

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, tenantId: string): Promise<AuthResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase(), tenantId },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Check if account is locked
    if (user.isLocked) {
      throw new UnauthorizedException(
        `Conta bloqueada até ${user.lockedUntil?.toLocaleString('pt-BR')}. Tente novamente mais tarde.`,
      );
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Conta inativa ou suspensa. Contate o administrador.');
    }

    const passwordValid = await user.validatePassword(dto.password);

    if (!passwordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Reset failed attempts on successful login
    await this.userRepository.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: () => 'NULL',
      lastLoginAt: new Date(),
      status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
    });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.eventEmitter.emit('auth.login', { userId: user.id, tenantId });

    return {
      user: this.toProfileDto(user),
      tokens,
    };
  }

  // ─── Register ─────────────────────────────────────────────────────────────
  async register(dto: RegisterDto, tenantId: string): Promise<AuthResponseDto> {
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

  // ─── Refresh Tokens ───────────────────────────────────────────────────────
  async refreshTokens(user: User): Promise<AuthTokensDto> {
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash: () => 'NULL' });
    this.eventEmitter.emit('auth.logout', { userId });
  }

  // ─── Get Profile ──────────────────────────────────────────────────────────
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.toProfileDto(user);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────
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
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  private async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
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
      [UserRole.TENANT_ADMIN]: ['users:manage', 'settings:manage', 'reports:view', 'finance:manage', 'inventory:manage', 'sales:manage', 'hr:manage'],
      [UserRole.MANAGER]: ['reports:view', 'finance:view', 'inventory:manage', 'sales:manage', 'hr:view'],
      [UserRole.EMPLOYEE]: ['inventory:view', 'sales:view'],
      [UserRole.VIEWER]: ['reports:view'],
    };

    return permissionMap[role] || [];
  }
}
