import { MigrationInterface, QueryRunner } from "typeorm";

const DISTRIBUTOR_COMPANY_FK = "FK_deals_distributor_company";
const DISTRIBUTOR_COMPANY_INDEX = "IDX_deals_distributor_company_id";

export class AddDealDistributorCompany1780317300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("deals", "distributor_company_id"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN distributor_company_id int unsigned NULL
      `);
    }

    // Canonical company-only deals do not require a matching legacy directory row.
    if (await queryRunner.hasColumn("deals", "distributor_id")) {
      await queryRunner.query(`
        ALTER TABLE deals
        MODIFY COLUMN distributor_id int NULL
      `);
    }

    let dealsTable = await queryRunner.getTable("deals");
    if (
      dealsTable &&
      !dealsTable.indices.some(({ name }) => name === DISTRIBUTOR_COMPANY_INDEX)
    ) {
      await queryRunner.query(`
        CREATE INDEX ${DISTRIBUTOR_COMPANY_INDEX}
        ON deals (distributor_company_id)
      `);
    }

    dealsTable = await queryRunner.getTable("deals");
    if (
      dealsTable &&
      !dealsTable.foreignKeys.some(
        ({ name }) => name === DISTRIBUTOR_COMPANY_FK,
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD CONSTRAINT ${DISTRIBUTOR_COMPANY_FK}
          FOREIGN KEY (distributor_company_id)
          REFERENCES companies(id)
          ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dealsTable = await queryRunner.getTable("deals");
    if (!dealsTable) return;

    const orphanedCanonicalDeals = await queryRunner.query(`
      SELECT COUNT(*) AS count
      FROM deals
      WHERE distributor_id IS NULL
    `);
    if (Number(orphanedCanonicalDeals?.[0]?.count || 0) > 0) {
      throw new Error(
        "Cannot restore deals.distributor_id NOT NULL: canonical-only deals require a legacy distributor mapping",
      );
    }

    if (
      dealsTable.foreignKeys.some(
        ({ name }) => name === DISTRIBUTOR_COMPANY_FK,
      )
    ) {
      await queryRunner.query(
        `ALTER TABLE deals DROP FOREIGN KEY ${DISTRIBUTOR_COMPANY_FK}`,
      );
    }

    if (
      dealsTable.indices.some(
        ({ name }) => name === DISTRIBUTOR_COMPANY_INDEX,
      )
    ) {
      await queryRunner.query(
        `DROP INDEX ${DISTRIBUTOR_COMPANY_INDEX} ON deals`,
      );
    }

    if (await queryRunner.hasColumn("deals", "distributor_company_id")) {
      await queryRunner.query(`
        ALTER TABLE deals
        DROP COLUMN distributor_company_id
      `);
    }

    await queryRunner.query(`
      ALTER TABLE deals
      MODIFY COLUMN distributor_id int NOT NULL
    `);
  }
}
