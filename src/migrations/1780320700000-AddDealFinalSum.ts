import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDealFinalSum1780320700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("deals", "final_deal_sum")) return;

    await queryRunner.addColumn(
      "deals",
      new TableColumn({
        name: "final_deal_sum",
        type: "decimal",
        precision: 15,
        scale: 2,
        isNullable: true,
        comment: "Итоговая сумма сделки",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("deals", "final_deal_sum")) {
      await queryRunner.dropColumn("deals", "final_deal_sum");
    }
  }
}
