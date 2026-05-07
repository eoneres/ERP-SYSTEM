/**
 * Migração de permissões: atualiza usuários existentes para o novo formato granular.
 * Executar uma única vez após o deploy das etapas de RBAC.
 *
 * Uso: cd apps/api && npx ts-node -r tsconfig-paths/register src/infrastructure/database/migrate-permissions.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ROLE_PERMISSIONS } from '../../shared/permissions';

dotenv.config({ path: '.env' });

const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_pass',
  database: process.env.DB_DATABASE || 'erp_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
  entities: [],
});

async function main() {
  console.log('🔌 Conectando ao banco...');
  await AppDataSource.initialize();
  console.log('✅ Conectado\n');

  const users: { id: string; role: string; email: string; permissions: string[] }[] =
    await AppDataSource.query(`SELECT id, role, email, permissions FROM users WHERE deleted_at IS NULL`);

  console.log(`📋 ${users.length} usuários encontrados\n`);

  let updated = 0;

  for (const user of users) {
    const newPermissions = ROLE_PERMISSIONS[user.role] ?? [];

    // super_admin mantém ['*']
    if (user.role === 'super_admin') {
      await AppDataSource.query(
        `UPDATE users SET permissions = $1 WHERE id = $2`,
        [JSON.stringify(['*']), user.id],
      );
      console.log(`  ✅ ${user.email} (${user.role}) → ['*']`);
      updated++;
      continue;
    }

    await AppDataSource.query(
      `UPDATE users SET permissions = $1 WHERE id = $2`,
      [JSON.stringify(newPermissions), user.id],
    );
    console.log(`  ✅ ${user.email} (${user.role}) → ${newPermissions.length} permissões`);
    updated++;
  }

  console.log(`\n✅ ${updated} usuários atualizados com sucesso`);
  await AppDataSource.destroy();
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
