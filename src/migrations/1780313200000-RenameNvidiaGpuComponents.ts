import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameNvidiaGpuComponents1780313200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE cnf_components
      SET name = CASE name
        WHEN 'Tesla A10 24 Gb' THEN 'NVIDIA A10 24 Gb'
        WHEN 'Tesla A2 16 Gb' THEN 'NVIDIA A2 16 Gb'
        WHEN 'Tesla A40 48 Gb' THEN 'NVIDIA A40 48 Gb'
        ELSE name
      END
      WHERE type_id = 'gpu-type-id'
        AND name IN ('Tesla A10 24 Gb', 'Tesla A2 16 Gb', 'Tesla A40 48 Gb')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE cnf_components
      SET name = CASE name
        WHEN 'NVIDIA A10 24 Gb' THEN 'Tesla A10 24 Gb'
        WHEN 'NVIDIA A2 16 Gb' THEN 'Tesla A2 16 Gb'
        WHEN 'NVIDIA A40 48 Gb' THEN 'Tesla A40 48 Gb'
        ELSE name
      END
      WHERE type_id = 'gpu-type-id'
        AND name IN ('NVIDIA A10 24 Gb', 'NVIDIA A2 16 Gb', 'NVIDIA A40 48 Gb')
    `);
  }
}
