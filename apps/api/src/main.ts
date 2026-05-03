import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@shared/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from '@shared/interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from '@shared/interceptors/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config  = app.get(ConfigService);
  const port    = config.get<number>('PORT', 3001);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  app.use(helmet.default());
  app.use(compression());
  app.use(cookieParser());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // Sem origin = Next.js proxy server-side → sempre permitir
      if (!origin) return callback(null, true);

      const allowed =
        nodeEnv === 'development' &&
        (origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.app.github.dev'));

      const explicit = config
        .get<string>('CORS_ORIGINS', '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
        .includes(origin);

      callback(null, allowed || explicit);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  });

  // ── Prefix global: /api/v1/*
  // IMPORTANTE: NÃO usar enableVersioning junto com setGlobalPrefix que já
  // contém a versão — causaria rotas duplicadas: /api/v1/v1/auth/login
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    new AuditLogInterceptor(),
  );

  if (nodeEnv !== 'production') {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('ERP System API')
      .setDescription('Enterprise Resource Planning - REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant-id')
      .build();

    SwaggerModule.setup(
      'api/v1/docs',
      app,
      SwaggerModule.createDocument(app, swaggerCfg),
      { swaggerOptions: { persistAuthorization: true } },
    );
  }

  await app.listen(port, '0.0.0.0');

  console.log(`
  ╔══════════════════════════════════════════════╗
  ║           ERP SYSTEM API v1.0                ║
  ╠══════════════════════════════════════════════╣
  ║  Port   : ${port}                                 ║
  ║  Env    : ${nodeEnv.padEnd(34)}║
  ║  Routes : /api/v1/*                          ║
  ║  Docs   : http://localhost:${port}/api/v1/docs    ║
  ╚══════════════════════════════════════════════╝
  `);
}

bootstrap();
