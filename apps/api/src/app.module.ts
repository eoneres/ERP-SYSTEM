import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';

import { AuthModule } from '@modules/auth/auth.module';
import { TenantsModule } from '@modules/tenants/tenants.module';
import { FinanceModule } from '@modules/finance/finance.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { SalesModule } from '@modules/sales/sales.module';
import { HRModule } from '@modules/hr/hr.module';
import { ReportsModule } from '@modules/reports/reports.module';

import { appConfig } from '@config/app.config';
import { databaseConfig } from '@config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env.local', '.env'],  // carrega .env (renomeado de 'env')
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host:     cfg.get('DB_HOST', 'localhost'),
        port:     cfg.get<number>('DB_PORT', 5432),
        username: cfg.get('DB_USERNAME', 'erp_user'),
        password: cfg.get('DB_PASSWORD', 'erp_pass'),
        database: cfg.get('DB_DATABASE', 'erp_db'),
        autoLoadEntities: true,
        synchronize: cfg.get('NODE_ENV') !== 'production',
        logging: cfg.get('DB_LOGGING') === 'true',
        ssl: cfg.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // Cache — Redis em prod, memória em dev (tolerante a Redis ausente)
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService) => {
        const host = cfg.get<string>('REDIS_HOST');
        if (host) {
          try {
            const { redisStore } = await import('cache-manager-redis-yet');
            const store = await redisStore({
              socket: {
                host,
                port: cfg.get<number>('REDIS_PORT', 6379),
                connectTimeout: 3000,
              },
              password: cfg.get('REDIS_PASSWORD') || undefined,
            });
            return { store, ttl: cfg.get<number>('REDIS_TTL', 3600) * 1000 };
          } catch {
            console.warn('[Cache] Redis indisponível — usando cache em memória');
          }
        }
        return { ttl: 60_000 };
      },
    }),

    // Filas — tolerante a Redis ausente
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: {
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get('REDIS_PASSWORD') || undefined,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        },
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [{
          ttl:   cfg.get<number>('THROTTLE_TTL', 60_000),
          limit: cfg.get<number>('THROTTLE_LIMIT', 100),
        }],
      }),
    }),

    EventEmitterModule.forRoot({ wildcard: true }),

    AuthModule,
    TenantsModule,
    FinanceModule,
    InventoryModule,
    SalesModule,
    HRModule,
    ReportsModule,
  ],
})
export class AppModule {}
