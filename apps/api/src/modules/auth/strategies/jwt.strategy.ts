import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { TokenBlacklistService } from '../services/token-blacklist.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
  jti?: string;  // JWT ID — usado para revogação
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly blacklist: TokenBlacklistService,
  ) {
    super({
      // Accept token from Authorization header OR ?token= query param (needed for SSE)
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.query?.token as string ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Verifica blacklist antes de qualquer coisa
    if (payload.jti && await this.blacklist.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Token revogado');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, tenantId: payload.tenantId },
    });

    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Conta inativa ou suspensa');
    if (user.isLocked) throw new UnauthorizedException('Conta temporariamente bloqueada');

    return user;
  }
}
