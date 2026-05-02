/**
 * Seed de desenvolvimento
 * Cria tenant demo + admin + categorias financeiras padrão
 *
 * Uso:
 *   cd apps/api
 *   npx ts-node -r tsconfig-paths/register src/infrastructure/database/seed.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env' });

// ─── UUID FIXO para o tenant demo ────────────────────────────────────────────
// UUID fixo garante que o frontend sempre saiba qual ID enviar
// sem precisar de chamada prévia à API.
export const DEMO_TENANT_ID   = '00000000-0000-4000-8000-000000000001';
export const DEMO_TENANT_SLUG = 'demo-tenant';

const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_pass',
  database: process.env.DB_DATABASE || 'erp_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: true,
  logging: false,
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
});

async function main() {
  console.log('🔌 Conectando ao banco...');
  await AppDataSource.initialize();
  console.log('✅ Conectado\n');

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // ── 1. Tenant demo ──────────────────────────────────────────────────────
    const existingTenant = await qr.query(
      `SELECT id FROM tenants WHERE id = $1 OR slug = $2 LIMIT 1`,
      [DEMO_TENANT_ID, DEMO_TENANT_SLUG],
    );

    if (existingTenant.length > 0) {
      console.log(`ℹ️  Tenant '${DEMO_TENANT_SLUG}' já existe (id: ${existingTenant[0].id})`);
    } else {
      await qr.query(
        `INSERT INTO tenants (
          id, slug, company_name, trade_name, email, plan, status,
          address, branding, feature_flags, settings,
          created_at, updated_at
        ) VALUES (
          $1, $2,
          'ERP Demo Company', 'Demo Corp', 'contato@demo.com',
          'professional', 'active',
          '{}', '{}', '{}',
          '{"currency":"BRL","language":"pt-BR","timezone":"America/Sao_Paulo","dateFormat":"DD/MM/YYYY"}',
          NOW(), NOW()
        )`,
        [DEMO_TENANT_ID, DEMO_TENANT_SLUG],
      );
      console.log(`✅ Tenant criado: ${DEMO_TENANT_SLUG} (id: ${DEMO_TENANT_ID})`);
    }

    // Resolve o ID real (pode diferir se tenant já existia com outro UUID)
    const tenantRow = await qr.query(
      `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
      [DEMO_TENANT_SLUG],
    );
    const finalTenantId: string = tenantRow[0]?.id ?? DEMO_TENANT_ID;

    // ── 2. Admin ─────────────────────────────────────────────────────────────
    const existingAdmin = await qr.query(
      `SELECT id FROM users WHERE email = 'admin@demo.com' AND tenant_id = $1 LIMIT 1`,
      [finalTenantId],
    );

    let adminId: string;

    if (existingAdmin.length > 0) {
      adminId = existingAdmin[0].id;
      console.log(`ℹ️  Usuário admin@demo.com já existe`);
    } else {
      adminId = uuidv4();
      const passwordHash = await bcrypt.hash('Admin@123', 12);
      await qr.query(
        `INSERT INTO users (
          id, tenant_id, first_name, last_name, email,
          password_hash, role, status,
          permissions, preferences,
          email_verified_at, failed_login_attempts,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'Admin', 'Demo', 'admin@demo.com',
          $3, 'tenant_admin', 'active',
          $4, '{}',
          NOW(), 0, NOW(), NOW()
        )`,
        [
          adminId, finalTenantId, passwordHash,
          JSON.stringify([
            'users:manage','settings:manage','reports:view',
            'finance:manage','inventory:manage','sales:manage','hr:manage',
          ]),
        ],
      );
      console.log(`✅ Admin criado: admin@demo.com / Admin@123`);
    }

    // ── 3. Gerente ────────────────────────────────────────────────────────────
    const existingManager = await qr.query(
      `SELECT id FROM users WHERE email = 'gerente@demo.com' AND tenant_id = $1 LIMIT 1`,
      [finalTenantId],
    );

    if (existingManager.length === 0) {
      const passwordHash = await bcrypt.hash('Gerente@123', 12);
      await qr.query(
        `INSERT INTO users (
          id, tenant_id, first_name, last_name, email,
          password_hash, role, status,
          permissions, preferences,
          email_verified_at, failed_login_attempts,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'João', 'Gerente', 'gerente@demo.com',
          $3, 'manager', 'active',
          $4, '{}',
          NOW(), 0, NOW(), NOW()
        )`,
        [
          uuidv4(), finalTenantId, passwordHash,
          JSON.stringify([
            'reports:view','finance:view',
            'inventory:manage','sales:manage','hr:view',
          ]),
        ],
      );
      console.log(`✅ Gerente criado: gerente@demo.com / Gerente@123`);
    } else {
      console.log(`ℹ️  Usuário gerente@demo.com já existe`);
    }

    // ── 4. Contas bancárias ───────────────────────────────────────────────────
    const existingAccounts = await qr
      .query(
        `SELECT id FROM finance_accounts WHERE tenant_id = $1 LIMIT 1`,
        [finalTenantId],
      )
      .catch(() => []);

    if (existingAccounts.length === 0) {
      await qr
        .query(
          `INSERT INTO finance_accounts (
            id, tenant_id, name, type, bank_name,
            current_balance, initial_balance, currency,
            is_active, color, created_by, created_at, updated_at
          ) VALUES
            ($1, $2, 'Conta Corrente Principal', 'checking', 'Banco Demo',
             50000, 50000, 'BRL', true, '#1D4ED8', $3, NOW(), NOW()),
            ($4, $2, 'Caixa', 'cash', NULL,
             5000, 5000, 'BRL', true, '#10B981', $3, NOW(), NOW())`,
          [uuidv4(), finalTenantId, adminId, uuidv4()],
        )
        .catch((e: Error) => console.log(`⚠️  Contas: ${e.message}`));
      console.log(`✅ Contas financeiras criadas`);
    } else {
      console.log(`ℹ️  Contas financeiras já existem`);
    }

    // ── 5. Categorias ─────────────────────────────────────────────────────────
    const existingCats = await qr
      .query(
        `SELECT id FROM finance_categories WHERE tenant_id = $1 LIMIT 1`,
        [finalTenantId],
      )
      .catch(() => []);

    if (existingCats.length === 0) {
      const cats = [
        { name: 'Vendas de Produtos',    type: 'income',  color: '#10B981', icon: 'shopping-bag' },
        { name: 'Prestação de Serviços', type: 'income',  color: '#3B82F6', icon: 'briefcase'    },
        { name: 'Outros Recebimentos',   type: 'income',  color: '#8B5CF6', icon: 'plus-circle'  },
        { name: 'Folha de Pagamento',    type: 'expense', color: '#EF4444', icon: 'users'        },
        { name: 'Aluguel e Imóveis',     type: 'expense', color: '#F59E0B', icon: 'home'         },
        { name: 'Fornecedores',          type: 'expense', color: '#EC4899', icon: 'truck'        },
        { name: 'Utilities',             type: 'expense', color: '#06B6D4', icon: 'zap'          },
        { name: 'Marketing',             type: 'expense', color: '#F97316', icon: 'trending-up'  },
        { name: 'Impostos',              type: 'expense', color: '#6B7280', icon: 'file-text'    },
        { name: 'Outros Gastos',         type: 'expense', color: '#9CA3AF', icon: 'minus-circle' },
      ];

      for (const cat of cats) {
        await qr
          .query(
            `INSERT INTO finance_categories (
              id, tenant_id, name, type, color, icon,
              is_active, created_by, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,true,$7,NOW(),NOW())`,
            [uuidv4(), finalTenantId, cat.name, cat.type, cat.color, cat.icon, adminId],
          )
          .catch(() => {});
      }
      console.log(`✅ ${cats.length} categorias financeiras criadas`);
    } else {
      console.log(`ℹ️  Categorias já existem`);
    }

    await qr.commitTransaction();

    console.log(`
═══════════════════════════════════════════════════════
  🎉 SEED CONCLUÍDO!
═══════════════════════════════════════════════════════
  Tenant ID:   ${finalTenantId}
  Tenant slug: ${DEMO_TENANT_SLUG}

  👤 Admin:    admin@demo.com   / Admin@123
  👤 Gerente:  gerente@demo.com / Gerente@123
═══════════════════════════════════════════════════════
`);
  } catch (error) {
    await qr.rollbackTransaction();
    console.error('❌ Erro no seed:', error);
    throw error;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
