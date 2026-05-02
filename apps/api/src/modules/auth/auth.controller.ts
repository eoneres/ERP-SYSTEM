import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard, JwtRefreshGuard, Public } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { ApiResponse } from '@shared/dto/api-response.dto';

@ApiTags('Auth')
@ApiHeader({ name: 'X-Tenant-ID', required: true, description: 'Tenant identifier' })
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário' })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const result = await this.authService.login(dto, tenantId);
    return ApiResponse.ok(result, 'Login realizado com sucesso');
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar novo usuário' })
  async register(
    @Body() dto: RegisterDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const result = await this.authService.register(dto, tenantId);
    return ApiResponse.ok(result, 'Usuário criado com sucesso');
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens de acesso' })
  async refresh(@CurrentUser() user: User) {
    const tokens = await this.authService.refreshTokens(user);
    return ApiResponse.ok(tokens, 'Tokens renovados');
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerrar sessão' })
  async logout(@CurrentUser('id') userId: string) {
    await this.authService.logout(userId);
    return ApiResponse.ok(null, 'Logout realizado com sucesso');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
  async getProfile(@CurrentUser('id') userId: string) {
    const profile = await this.authService.getProfile(userId);
    return ApiResponse.ok(profile);
  }
}
