import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizeNetworkPortsCount1780313100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE cnf_network_profiles np
      JOIN cnf_components c ON c.id = np.component_id
      SET np.ports_count = CASE
        WHEN UPPER(c.name) REGEXP '(^|[^0-9])([0-9]+)[ -]?PORT' THEN
          CAST(REGEXP_REPLACE(UPPER(c.name), '.*(^|[^0-9])([0-9]+)[ -]?PORT.*', '\\\\2') AS UNSIGNED)
        WHEN UPPER(c.name) REGEXP '(^|[^0-9])([0-9]+)[XХ×][ ]*[0-9]+([.,][0-9]+)?[ ]*(G|GB|GBE|GBPS|ГБ|ГБИТ)' THEN
          CAST(REGEXP_REPLACE(UPPER(c.name), '.*(^|[^0-9])([0-9]+)[XХ×][ ]*[0-9]+([.,][0-9]+)?[ ]*(G|GB|GBE|GBPS|ГБ|ГБИТ).*', '\\\\2') AS UNSIGNED)
        WHEN UPPER(c.name) LIKE '%DUAL-PORT%' OR UPPER(c.name) LIKE '%DUAL PORT%' THEN 2
        WHEN UPPER(c.name) LIKE '%QUAD-PORT%' OR UPPER(c.name) LIKE '%QUAD PORT%' THEN 4
        ELSE np.ports_count
      END
    `);
  }

  public async down(): Promise<void> {
    // Данные пересчитаны из названий компонент; обратное восстановление прежних ошибок не требуется.
  }
}
