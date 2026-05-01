import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { AuthModule } from '@modules/auth/auth.module';
import { TenantsModule } from '@modules/tenants/tenants.module';
import { FinanceModule } from '@modules/finance/finance.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { SalesModule } from '@modules/sales/sales.module';
import { HRModule } from '@modules/hr/hr.module';
import { ReportsModule } from '@modules/reports/reports.module';

import { databaseConfig } from '@config/database.config';
import { appConfig } from '@config/app.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/infrastructure/database/migrations/*{.ts,.js}'],
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        logging: config.get('DB_LOGGING') === 'true',
        synchronize: config.get('NODE_ENV') === 'development',
        migrationsRun: true,
      }),
    }),

    // Cache (Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get('REDIS_HOST'),
            port: config.get<number>('REDIS_PORT'),
          },
          password: config.get('REDIS_PASSWORD'),
          ttl: config.get<number>('REDIS_TTL', 3600) * 1000,
        }),
      }),
    }),

    // Queue (Bull + Redis)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // Event Emitter
    EventEmitterModule.forRoot({ wildcard: true }),

    // Feature modules
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
