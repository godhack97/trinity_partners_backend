import { MigrationInterface, QueryRunner } from "typeorm";

export class PreserveLegacyDistributorDealAccess1780321800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Before explicit delivery existed, registered/won/lost deals were already
    // visible to their selected distributor. Preserve that access during the
    // transition; new deals still require the explicit send action.
    await queryRunner.query(`
      UPDATE deals
      SET distributor_sent_at = COALESCE(updated_at, created_at),
          distributor_sent_by = responsible_manager_id
      WHERE distributor_company_id IS NOT NULL
        AND distributor_sent_at IS NULL
        AND status IN ('registered', 'win', 'loose')
    `);
  }

  public async down(): Promise<void> {
    // Intentionally empty: a blanket rollback could revoke distributor access
    // that was explicitly granted after this migration ran.
  }
}
