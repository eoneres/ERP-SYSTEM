/**
 * Seed de desenvolvimento
 * Cria tenant demo + admin + categorias financeiras padrão
 * Uso: npx ts-node -r tsconfig-paths/register src/infrastructure/database/seed.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env' });

// ─── Conexão direta (sem o NestJS inteiro) ───────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_pass',
  database: process.env.DB_DATABASE || 'erp_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: true,        // cria tabelas se não existirem
  logging: false,
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
});

async function main() {
  console.log('🔌 Conectando ao banco...');
  await AppDataSource.initialize();
  console.log('✅ Conectado');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ── 1. Tenant demo ──────────────────────────────────────────────────────
    const tenantId = uuidv4();

    const existingTenant = await queryRunner.query(
      `SELECT id FROM tenants WHERE slug = 'demo-tenant' LIMIT 1`,
    );

    let finalTenantId: string;

    if (existingTenant.length > 0) {
      finalTenantId = existingTenant[0].id;
      console.log(`ℹ️  Tenant 'demo-tenant' já existe (id: ${finalTenantId})`);
    } else {
      finalTenantId = tenantId;
      await queryRunner.query(`
        INSERT INTO tenants (
          id, slug, company_name, trade_name, email, plan, status,
          address, branding, feature_flags, settings,
          created_at, updated_at
        ) VALUES (
          $1, 'demo-tenant', 'ERP Demo Company', 'Demo Corp',
          'contato@demo.com', 'professional', 'active',
          '{}', '{}', '{}',
          '{"currency":"BRL","language":"pt-BR","timezone":"America/Sao_Paulo","dateFormat":"DD/MM/YYYY"}',
          NOW(), NOW()
        )
      `, [finalTenantId]);
      console.log(`✅ Tenant criado: demo-tenant (id: ${finalTenantId})`);
    }

    // ── 2. Usuário admin ─────────────────────────────────────────────────────
    const existingUser = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'admin@demo.com' AND tenant_id = $1 LIMIT 1`,
      [finalTenantId],
    );

    if (existingUser.length > 0) {
      console.log(`ℹ️  Usuário admin@demo.com já existe`);
    } else {
      const passwordHash = await bcrypt.hash('Admin@123', 12);
      const adminId = uuidv4();

      await queryRunner.query(`
        INSERT INTO users (
          id, tenant_id, first_name, last_name, email,
          password_hash, role, status,
          permissions, preferences,
          email_verified_at, failed_login_attempts,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'Admin', 'Demo', 'admin@demo.com',
          $3, 'tenant_admin', 'active',
          $4, '{}',
          NOW(), 0,
          NOW(), NOW()
        )
      `, [
        adminId,
        finalTenantId,
        passwordHash,
        JSON.stringify([
          'users:manage', 'settings:manage', 'reports:view',
          'finance:manage', 'inventory:manage', 'sales:manage', 'hr:manage',
        ]),
      ]);

      console.log(`✅ Usuário criado: admin@demo.com / Admin@123`);
    }

    // ── 3. Usuário gerente (para testar RBAC) ────────────────────────────────
    const existingManager = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'gerente@demo.com' AND tenant_id = $1 LIMIT 1`,
      [finalTenantId],
    );

    if (existingManager.length === 0) {
      const passwordHash = await bcrypt.hash('Gerente@123', 12);
      await queryRunner.query(`
        INSERT INTO users (
          id, tenant_id, first_name, last_name, email,
          password_hash, role, status,
          permissions, preferences,
          email_verified_at, failed_login_attempts,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'João', 'Gerente', 'gerente@demo.com',
          $3, 'manager', 'active',
          $4, '{}',
          NOW(), 0,
          NOW(), NOW()
        )
      `, [
        uuidv4(),
        finalTenantId,
        passwordHash,
        JSON.stringify(['reports:view', 'finance:view', 'inventory:manage', 'sales:manage', 'hr:view']),
      ]);
      console.log(`✅ Usuário criado: gerente@demo.com / Gerente@123`);
    }

    // ── 4. Conta bancária padrão ─────────────────────────────────────────────
    const existingAccount = await queryRunner.query(
      `SELECT id FROM finance_accounts WHERE tenant_id = $1 LIMIT 1`,
      [finalTenantId],
    ).catch(() => []); // tabela pode não existir ainda

    if (existingAccount.length === 0) {
      await queryRunner.query(`
        INSERT INTO finance_accounts (
          id, tenant_id, name, type, bank_name,
          current_balance, initial_balance, currency,
          is_active, created_by, created_at, updated_at
        ) VALUES
          ($1, $2, 'Conta Corrente Principal', 'checking', 'Banco Demo',
           50000, 50000, 'BRL', true, $3, NOW(), NOW()),
          ($4, $2, 'Caixa', 'cash', NULL,
           5000, 5000, 'BRL', true, $3, NOW(), NOW())
      `, [uuidv4(), finalTenantId, uuidv4(), uuidv4()]).catch((e) => {
        console.log(`⚠️  Contas: ${e.message} (tabela pode não existir — ok)`);
      });
      console.log(`✅ Contas financeiras criadas`);
    } else {
      console.log(`ℹ️  Contas financeiras já existem`);
    }

    // ── 5. Categorias financeiras padrão ─────────────────────────────────────
    const existingCats = await queryRunner.query(
      `SELECT id FROM finance_categories WHERE tenant_id = $1 LIMIT 1`,
      [finalTenantId],
    ).catch(() => []);

    if (existingCats.length === 0) {
      const adminUserId = (await queryRunner.query(
        `SELECT id FROM users WHERE email = 'admin@demo.com' AND tenant_id = $1 LIMIT 1`,
        [finalTenantId],
      ))[0]?.id;

      const incomeCategories = [
        { name: 'Vendas de Produtos', color: '#10B981', icon: 'shopping-bag' },
        { name: 'Prestação de Serviços', color: '#3B82F6', icon: 'briefcase' },
        { name: 'Outros Recebimentos', color: '#8B5CF6', icon: 'plus-circle' },
      ];

      const expenseCategories = [
        { name: 'Folha de Pagamento', color: '#EF4444', icon: 'users' },
        { name: 'Aluguel e Imóveis', color: '#F59E0B', icon: 'home' },
        { name: 'Fornecedores', color: '#EC4899', icon: 'truck' },
        { name: 'Utilities (água, luz)', color: '#06B6D4', icon: 'zap' },
        { name: 'Marketing', color: '#F97316', icon: 'trending-up' },
        { name: 'Impostos', color: '#6B7280', icon: 'file-text' },
        { name: 'Outros Gastos', color: '#9CA3AF', icon: 'minus-circle' },
      ];

      for (const cat of incomeCategories) {
        await queryRunner.query(`
          INSERT INTO finance_categories (
            id, tenant_id, name, type, color, icon, is_active, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'income', $4, $5, true, $6, NOW(), NOW())
        `, [uuidv4(), finalTenantId, cat.name, cat.color, cat.icon, adminUserId]).catch(() => {});
      }

      for (const cat of expenseCategories) {
        await queryRunner.query(`
          INSERT INTO finance_categories (
            id, tenant_id, name, type, color, icon, is_active, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, 'expense', $4, $5, true, $6, NOW(), NOW())
        `, [uuidv4(), finalTenantId, cat.name, cat.color, cat.icon, adminUserId]).catch(() => {});
      }

      console.log(`✅ ${incomeCategories.length + expenseCategories.length} categorias financeiras criadas`);
    } else {
      console.log(`ℹ️  Categorias financeiras já existem`);
    }

    await queryRunner.commitTransaction();

    console.log('\n🎉 Seed concluído com sucesso!\n');
    console.log('═══════════════════════════════════════════');
    console.log('  CREDENCIAIS DE ACESSO');
    console.log('═══════════════════════════════════════════');
    console.log('  Tenant ID:  demo-tenant');
    console.log('  Admin:      admin@demo.com   / Admin@123');
    console.log('  Gerente:    gerente@demo.com / Gerente@123');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
