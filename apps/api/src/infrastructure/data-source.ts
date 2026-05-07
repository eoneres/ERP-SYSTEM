/**
 * DataSource dedicado para a CLI do TypeORM.
 * Usado pelos scripts: migration:generate, migration:run, migration:revert
 *
 * NÃO é usado pelo AppModule em runtime — o AppModule usa TypeOrmModule.forRootAsync().
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_pass',
  database: process.env.DB_DATABASE || 'erp_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

  // Entidades — carrega os arquivos compilados em dist/
  entities: [join(__dirname, '../../modules/**/*.entity{.ts,.js}')],

  // Migrações
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',

  // NUNCA synchronize em produção
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
