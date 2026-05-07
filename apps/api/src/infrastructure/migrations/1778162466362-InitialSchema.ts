import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration baseline — schema inicial do ERP System v1.0
 *
 * Esta migration NÃO executa DDL porque o banco já foi criado via synchronize:true.
 * Ela serve como ponto de partida (baseline) para o sistema de migrações.
 * Todas as migrations futuras serão geradas a partir deste ponto.
 *
 * Para aplicar em um banco novo (sem dados), use o seed:
 *   cd apps/api && npm run db:seed
 */
export class InitialSchema1778162466362 implements MigrationInterface {
  name = 'InitialSchema1778162466362';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Baseline: schema já existe via synchronize:true
    // Futuras migrations serão geradas com: npm run migration:generate -- NomeDaMigration
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback do baseline não é suportado — restaure um backup do banco
  }
}
