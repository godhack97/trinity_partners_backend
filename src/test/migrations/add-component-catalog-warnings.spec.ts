import { QueryRunner } from "typeorm";
import { AddComponentCatalogWarnings1780319000000 } from "../../migrations/1780319000000-AddComponentCatalogWarnings";

describe("AddComponentCatalogWarnings1780319000000", () => {
  it("adds warning fields and restores the premium support warning", async () => {
    const queries: Array<{ sql: string; parameters?: unknown[] }> = [];
    const runner = {
      query: jest.fn(async (sql: string, parameters?: unknown[]) => {
        queries.push({ sql: sql.replace(/\s+/gu, " ").trim(), parameters });
      }),
    } as unknown as QueryRunner;

    await new AddComponentCatalogWarnings1780319000000().up(runner);

    expect(queries[0].sql).toContain("ADD COLUMN warning_text text");
    expect(queries[0].sql).toContain("ADD COLUMN warning_color varchar(20)");
    expect(queries[1].parameters).toEqual([
      "Стоимость премиум-поддержки рассчитывается отдельно ответственным менеджером.",
      "#D97706",
      "7c940001-2d4a-4d51-9000-000000000005",
    ]);
  });

  it("removes both warning fields on rollback", async () => {
    const query = jest.fn();
    const runner = { query } as unknown as QueryRunner;

    await new AddComponentCatalogWarnings1780319000000().down(runner);

    expect(query).toHaveBeenCalledWith(expect.stringContaining(
      "DROP COLUMN warning_color",
    ));
    expect(query).toHaveBeenCalledWith(expect.stringContaining(
      "DROP COLUMN warning_text",
    ));
  });
});
