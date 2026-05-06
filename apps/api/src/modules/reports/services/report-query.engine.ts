import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryDefinition } from '../entities/report-template.entity';

@Injectable()
export class ReportQueryEngine {
  private readonly logger = new Logger(ReportQueryEngine.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(
    queryDef: QueryDefinition,
    tenantId: string,
    params: Record<string, any>,
  ): Promise<Record<string, any>[]> {
    let sql = queryDef.sql;
    const values: any[] = [];
    let idx = 1;

    const paramIndex: Record<string, number> = {};

    // 1. tenantId — uuid, injected as-is
    paramIndex['tenantId'] = idx++;
    values.push(tenantId);

    // 2. All declared filter params — always pushed as text (or null)
    for (const name of queryDef.params) {
      if (!(name in paramIndex)) {
        paramIndex[name] = idx++;
        const v = params[name];
        values.push(v === '' || v === undefined || v === null ? null : String(v));
      }
    }

    // 3. Replace :tenantId with $1 (uuid)
    sql = sql.replace(/:tenantId\b/g, `$${paramIndex['tenantId']}`);

    // 4. Replace each :param with NULLIF($N, '') — this way:
    //    - when value is null  → NULLIF(null, '') = null  → IS NULL check passes
    //    - when value is 'x'  → NULLIF('x', '')  = 'x'   → comparison works
    //    The SQL templates use: (NULLIF($N,'') IS NULL OR col = NULLIF($N,''))
    //    But since we replace :param everywhere, the template just writes :param
    //    and we wrap it in NULLIF here.
    for (const name of queryDef.params) {
      const n = paramIndex[name];
      // Replace :param with NULLIF($N, '') — works for text comparisons
      sql = sql.replace(new RegExp(`:${name}\\b`, 'g'), `NULLIF($${n}, '')`);
    }

    this.logger.log(`[ReportEngine] SQL:\n${sql}`);
    this.logger.log(`[ReportEngine] values: ${JSON.stringify(values)}`);

    const rows = await this.dataSource.query(sql, values);
    this.logger.log(`[ReportEngine] rows returned: ${rows.length}`);
    return rows;
  }
}
