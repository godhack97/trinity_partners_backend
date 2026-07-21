import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizeServerImageUrls1780316100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("cnf_servers", "images"))) return;

    await queryRunner.query(`
      UPDATE cnf_servers
      SET image = REPLACE(
        REPLACE(image, 'http://localhost/public/', '/public/'),
        'localhost/public/',
        '/public/'
      )
      WHERE image LIKE 'localhost/public/%'
         OR image LIKE 'http://localhost/public/%'
    `);

    await queryRunner.query(`
      UPDATE cnf_servers
      SET images = REPLACE(
        REPLACE(images, 'http://localhost/public/', '/public/'),
        'localhost/public/',
        '/public/'
      )
      WHERE images LIKE '%localhost/public/%'
    `);
  }

  // The previous hostname was incomplete and cannot be safely restored.
  public async down(): Promise<void> {}
}
