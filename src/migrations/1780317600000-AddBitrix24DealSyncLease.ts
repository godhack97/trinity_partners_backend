import { MigrationInterface, QueryRunner } from "typeorm";

const BITRIX24_SYNC_LEASE_INDEX = "IDX_deals_bitrix24_sync_lease";

export class AddBitrix24DealSyncLease1780317600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("deals", "bitrix24_sync_status")) {
      await queryRunner.query(`
        ALTER TABLE deals
        MODIFY COLUMN bitrix24_sync_status
          enum('pending','processing','synced','failed')
          NULL DEFAULT 'pending'
          COMMENT 'Статус синхронизации с Bitrix24'
      `);
    }

    if (!(await queryRunner.hasColumn("deals", "bitrix24_sync_started_at"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN bitrix24_sync_started_at datetime(6) NULL
          COMMENT 'Начало текущей аренды синхронизации с Bitrix24'
      `);
    }

    if (!(await queryRunner.hasColumn("deals", "bitrix24_sync_token"))) {
      await queryRunner.query(`
        ALTER TABLE deals
        ADD COLUMN bitrix24_sync_token varchar(36) NULL
          COMMENT 'Токен владельца текущей аренды синхронизации с Bitrix24'
      `);
    }

    const dealsTable = await queryRunner.getTable("deals");
    if (
      dealsTable &&
      !dealsTable.indices.some(
        ({ name }) => name === BITRIX24_SYNC_LEASE_INDEX,
      )
    ) {
      await queryRunner.query(`
        CREATE INDEX ${BITRIX24_SYNC_LEASE_INDEX}
        ON deals (bitrix24_sync_status, bitrix24_sync_started_at)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("deals", "bitrix24_sync_status")) {
      // A worker cannot keep a lease after the lease columns are removed.
      // Failed makes those records eligible for the legacy retry job.
      await queryRunner.query(`
        UPDATE deals
        SET bitrix24_sync_status = 'failed'
        WHERE bitrix24_sync_status = 'processing'
      `);
    }

    const dealsTable = await queryRunner.getTable("deals");
    if (
      dealsTable?.indices.some(
        ({ name }) => name === BITRIX24_SYNC_LEASE_INDEX,
      )
    ) {
      await queryRunner.query(
        `DROP INDEX ${BITRIX24_SYNC_LEASE_INDEX} ON deals`,
      );
    }

    if (await queryRunner.hasColumn("deals", "bitrix24_sync_token")) {
      await queryRunner.query(`
        ALTER TABLE deals
        DROP COLUMN bitrix24_sync_token
      `);
    }

    if (await queryRunner.hasColumn("deals", "bitrix24_sync_started_at")) {
      await queryRunner.query(`
        ALTER TABLE deals
        DROP COLUMN bitrix24_sync_started_at
      `);
    }

    if (await queryRunner.hasColumn("deals", "bitrix24_sync_status")) {
      await queryRunner.query(`
        ALTER TABLE deals
        MODIFY COLUMN bitrix24_sync_status
          enum('pending','synced','failed')
          NULL DEFAULT 'pending'
          COMMENT 'Статус синхронизации с Bitrix24'
      `);
    }
  }
}
