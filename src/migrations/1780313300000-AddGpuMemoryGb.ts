import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGpuMemoryGb1780313300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasMemoryColumn = await queryRunner.hasColumn(
      "cnf_gpu_profiles",
      "memory_gb",
    );

    if (!hasMemoryColumn) {
      await queryRunner.query(`
        ALTER TABLE cnf_gpu_profiles
        ADD COLUMN memory_gb int DEFAULT NULL AFTER physical_slots
      `);
    }

    await queryRunner.query(`
      UPDATE cnf_gpu_profiles gp
      JOIN cnf_components c ON c.id = gp.component_id
      SET gp.memory_gb = CASE c.name
        WHEN 'NVIDIA A2 16 Gb' THEN 16
        WHEN 'NVIDIA A10 24 Gb' THEN 24
        WHEN 'NVIDIA A40 48 Gb' THEN 48
        ELSE gp.memory_gb
      END
      WHERE c.type_id = 'gpu-type-id'
        AND c.name IN ('NVIDIA A2 16 Gb', 'NVIDIA A10 24 Gb', 'NVIDIA A40 48 Gb')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasMemoryColumn = await queryRunner.hasColumn(
      "cnf_gpu_profiles",
      "memory_gb",
    );

    if (hasMemoryColumn) {
      await queryRunner.query(`
        ALTER TABLE cnf_gpu_profiles
        DROP COLUMN memory_gb
      `);
    }
  }
}
