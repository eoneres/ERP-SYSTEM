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

  const configService = app.get(ConfigService);
  const port      = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv   = configService.get<string>('NODE_ENV', 'development');

  app.use(helmet.default());
  app.use(compression());
  app.use(cookieParser());

  // ─── CORS ──────────────────────────────────────────────────────────────────
  // Em desenvolvimento: aceita qualquer origem *.app.github.dev (Codespaces),
  // localhost e 127.0.0.1. Em produção: somente origens explícitas.
  const allowedOrigins = (configService.get<string>('CORS_ORIGINS', 'http://localhost:3000'))
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Sem origin = request server-side (proxy Next.js) — sempre permitir
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        (nodeEnv === 'development' && (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.app.github.dev')   // Codespaces
        ));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
  });

  app.setGlobalPrefix(apiPrefix);

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
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ERP System API')
      .setDescription('Enterprise Resource Planning - REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant-id')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');

  console.log(`
  ╔══════════════════════════════════════════╗
  ║          ERP SYSTEM API v1.0             ║
  ╠══════════════════════════════════════════╣
  ║  Port:  ${port}                              ║
  ║  Env:   ${nodeEnv.padEnd(32)}║
  ╚══════════════════════════════════════════╝
  `);
}

bootstrap();
