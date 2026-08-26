import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNewsReads1780320200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("news_reads")) return;

    await queryRunner.query(`
      CREATE TABLE news_reads (
        id int NOT NULL AUTO_INCREMENT,
        user_id int unsigned NOT NULL,
        news_id int NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX UQ_news_reads_user_news (user_id, news_id),
        INDEX IDX_news_reads_news (news_id),
        CONSTRAINT FK_news_reads_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_news_reads_news
          FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("news_reads")) {
      await queryRunner.query("DROP TABLE news_reads");
    }
  }
}
