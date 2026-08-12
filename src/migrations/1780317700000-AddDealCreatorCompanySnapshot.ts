import { MigrationInterface, QueryRunner } from "typeorm";

const CREATOR_COMPANY_INDEX = "IDX_deals_creator_company_id";
const CREATOR_COMPANY_FK = "FK_deals_creator_company";

export class AddDealCreatorCompanySnapshot1780317700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("deals", "creator_company_id"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN creator_company_id int unsigned NULL
      `);
    }

    let dealsTable = await queryRunner.getTable("deals");
    if (
      dealsTable &&
      !dealsTable.indices.some(({ name }) => name === CREATOR_COMPANY_INDEX)
    ) {
      await queryRunner.query(`
        CREATE INDEX ${CREATOR_COMPANY_INDEX}
        ON deals (creator_company_id)
      `);
    }

    dealsTable = await queryRunner.getTable("deals");
    if (
      dealsTable &&
      !dealsTable.foreignKeys.some(({ name }) => name === CREATOR_COMPANY_FK)
    ) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD CONSTRAINT ${CREATOR_COMPANY_FK}
          FOREIGN KEY (creator_company_id)
          REFERENCES companies(id)
          ON DELETE RESTRICT
      `);
    }

    // Backfill only a single, unambiguous historical company. Accepted,
    // blocked and deleted memberships are evidence of a real former
    // association; invitations and rejected applications are not.
    await queryRunner.query(`
      UPDATE deals deal
      INNER JOIN (
        SELECT candidate.deal_id, MIN(candidate.company_id) creator_company_id
        FROM (
          SELECT owner_deal.id deal_id, owner_company.id company_id
          FROM deals owner_deal
          INNER JOIN companies owner_company
            ON owner_company.owner_id = owner_deal.creator_id

          UNION ALL

          SELECT member_deal.id deal_id, membership.company_id company_id
          FROM deals member_deal
          INNER JOIN company_employees membership
            ON membership.employee_id = member_deal.creator_id
           AND membership.status IN ('accept', 'blocked', 'deleted')
        ) candidate
        GROUP BY candidate.deal_id
        HAVING COUNT(DISTINCT candidate.company_id) = 1
      ) resolved_company ON resolved_company.deal_id = deal.id
      SET deal.creator_company_id = resolved_company.creator_company_id
      WHERE deal.creator_company_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dealsTable = await queryRunner.getTable("deals");
    if (!dealsTable) return;

    if (
      dealsTable.foreignKeys.some(({ name }) => name === CREATOR_COMPANY_FK)
    ) {
      await queryRunner.query(
        `ALTER TABLE deals DROP FOREIGN KEY ${CREATOR_COMPANY_FK}`,
      );
    }

    if (
      dealsTable.indices.some(({ name }) => name === CREATOR_COMPANY_INDEX)
    ) {
      await queryRunner.query(
        `DROP INDEX ${CREATOR_COMPANY_INDEX} ON deals`,
      );
    }

    if (await queryRunner.hasColumn("deals", "creator_company_id")) {
      await queryRunner.query(`
        ALTER TABLE deals
        DROP COLUMN creator_company_id
      `);
    }
  }
}
