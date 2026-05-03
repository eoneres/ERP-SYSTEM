import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

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
    const [existing] = await qr.query(
      `SELECT id FROM tenants WHERE id = $1 OR slug = $2 LIMIT 1`,
      [DEMO_TENANT_ID, DEMO_TENANT_SLUG],
    );

    if (existing) {
      console.log(`ℹ️  Tenant '${DEMO_TENANT_SLUG}' já existe`);
    } else {
      await qr.query(`
        INSERT INTO tenants (
          id, slug, company_name, trade_name, email, plan, status,
          address, branding, feature_flags, settings, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [
        DEMO_TENANT_ID,
        DEMO_TENANT_SLUG,
        'ERP Demo Company',
        'Demo Corp',
        'contato@demo.com',
        'professional',
        'active',
        JSON.stringify({}),
        JSON.stringify({}),
        JSON.stringify({}),
        JSON.stringify({ currency: 'BRL', language: 'pt-BR', timezone: 'America/Sao_Paulo', dateFormat: 'DD/MM/YYYY' }),
      ]);
      console.log(`✅ Tenant criado: ${DEMO_TENANT_SLUG} (id: ${DEMO_TENANT_ID})`);
    }

    // ── 2. Admin ────────────────────────────────────────────────────────────
    const [existingAdmin] = await qr.query(
      `SELECT id FROM users WHERE email = $1 AND tenant_id = $2 LIMIT 1`,
      ['admin@demo.com', DEMO_TENANT_ID],
    );

    if (existingAdmin) {
      console.log(`ℹ️  admin@demo.com já existe`);
    } else {
      const hash = await bcrypt.hash('Admin@123', 12);
      await qr.query(`
        INSERT INTO users (
          first_name, last_name, email, password_hash, role, status,
          tenant_id, permissions, preferences,
          failed_login_attempts, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      `, [
        'Admin', 'Demo', 'admin@demo.com', hash,
        'tenant_admin', 'active',
        DEMO_TENANT_ID,
        JSON.stringify(['*']),
        JSON.stringify({}),
        0,
      ]);
      console.log(`✅ admin@demo.com criado (senha: Admin@123)`);
    }

    // ── 3. Gerente ─────────────────────────────────────────────────────────
    const [existingMgr] = await qr.query(
      `SELECT id FROM users WHERE email = $1 AND tenant_id = $2 LIMIT 1`,
      ['gerente@demo.com', DEMO_TENANT_ID],
    );

    if (!existingMgr) {
      const hash = await bcrypt.hash('Gerente@123', 12);
      await qr.query(`
        INSERT INTO users (
          first_name, last_name, email, password_hash, role, status,
          tenant_id, permissions, preferences,
          failed_login_attempts, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      `, [
        'João', 'Gerente', 'gerente@demo.com', hash,
        'manager', 'active',
        DEMO_TENANT_ID,
        JSON.stringify(['reports:view','finance:view','inventory:manage','sales:manage','hr:view']),
        JSON.stringify({}),
        0,
      ]);
      console.log(`✅ gerente@demo.com criado (senha: Gerente@123)`);
    }

    // ── 4. Conta bancária demo ──────────────────────────────────────────────
    try {
      const [acct] = await qr.query(
        `SELECT id FROM finance_accounts WHERE tenant_id = $1 LIMIT 1`,
        [DEMO_TENANT_ID],
      );
      if (!acct) {
        await qr.query(`
          INSERT INTO finance_accounts
            (name, type, bank_name, current_balance, initial_balance, currency, is_active, tenant_id, created_at, updated_at)
          VALUES
            ('Conta Corrente', 'checking', 'Banco Demo', 50000, 50000, 'BRL', true, $1, NOW(), NOW()),
            ('Caixa', 'cash', NULL, 5000, 5000, 'BRL', true, $1, NOW(), NOW())
        `, [DEMO_TENANT_ID]);
        console.log(`✅ Contas financeiras criadas`);
      }
    } catch { console.log(`⚠️  finance_accounts ainda não existe — rode após sync`); }


    // ── 4. Categorias financeiras padrão ──────────────────────────────────────
    try {
      const [existCat] = await qr.query(
        `SELECT id FROM finance_categories WHERE tenant_id = $1 LIMIT 1`,
        [DEMO_TENANT_ID],
      );
      if (!existCat) {
        const [adminRow] = await qr.query(
          `SELECT id FROM users WHERE email = 'admin@demo.com' AND tenant_id = $1 LIMIT 1`,
          [DEMO_TENANT_ID],
        );
        const adminId = adminRow?.id ?? null;
        const cats = [
          // receitas
          { name: 'Vendas de Produtos',    type: 'income',  color: '#10B981', icon: 'shopping-bag' },
          { name: 'Prestação de Serviços', type: 'income',  color: '#3B82F6', icon: 'briefcase' },
          { name: 'Outros Recebimentos',   type: 'income',  color: '#8B5CF6', icon: 'plus-circle' },
          // despesas
          { name: 'Folha de Pagamento',    type: 'expense', color: '#EF4444', icon: 'users' },
          { name: 'Fornecedores',          type: 'expense', color: '#F59E0B', icon: 'truck' },
          { name: 'Aluguel',               type: 'expense', color: '#EC4899', icon: 'home' },
          { name: 'Utilities',             type: 'expense', color: '#06B6D4', icon: 'zap' },
          { name: 'Impostos',              type: 'expense', color: '#6B7280', icon: 'file-text' },
          { name: 'Marketing',             type: 'expense', color: '#F97316', icon: 'trending-up' },
          { name: 'Outros Gastos',         type: 'expense', color: '#9CA3AF', icon: 'minus-circle' },
        ];
        for (const c of cats) {
          await qr.query(
            `INSERT INTO finance_categories (name, type, color, icon, is_active, tenant_id, created_by, created_at, updated_at)
             VALUES ($1,$2,$3,$4,true,$5,$6,NOW(),NOW())`,
            [c.name, c.type, c.color, c.icon, DEMO_TENANT_ID, adminId],
          );
        }
        console.log(`✅ ${cats.length} categorias financeiras criadas`);
      } else {
        console.log('ℹ️  Categorias já existem');
      }
    } catch (e: any) { console.log(`⚠️  Categorias: ${e.message}`); }

    await qr.commitTransaction();

    console.log(`
═══════════════════════════════════════
  SEED CONCLUÍDO
═══════════════════════════════════════
  Tenant:  ${DEMO_TENANT_SLUG}
  ID:      ${DEMO_TENANT_ID}

  admin@demo.com   → Admin@123
  gerente@demo.com → Gerente@123
═══════════════════════════════════════
    `);
  } catch (e) {
    await qr.rollbackTransaction();
    throw e;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
