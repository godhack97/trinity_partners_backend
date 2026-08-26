import { QueryRunner } from "typeorm";
import { AddComponentTypeSelectedOrdering1780320100000 } from "../../migrations/1780320100000-AddComponentTypeSelectedOrdering";

describe("AddComponentTypeSelectedOrdering1780320100000", () => {
  it("enables selected ordering by default and disables it for CPU", async () => {
    const queries: Array<{ sql: string; parameters?: unknown[] }> = [];
    const runner = {
      query: jest.fn(async (sql: string, parameters?: unknown[]) => {
        queries.push({ sql: sql.replace(/\s+/gu, " ").trim(), parameters });
      }),
    } as unknown as QueryRunner;

    await new AddComponentTypeSelectedOrdering1780320100000().up(runner);

    expect(queries[0].sql).toContain(
      "ADD COLUMN move_selected_to_top tinyint(1) NOT NULL DEFAULT 1",
    );
    expect(queries[1].sql).toContain("SET move_selected_to_top = 0");
    expect(queries[1].parameters).toEqual(["cpu-type-id"]);
  });

  it("removes the setting on rollback", async () => {
    const query = jest.fn();
    const runner = { query } as unknown as QueryRunner;

    await new AddComponentTypeSelectedOrdering1780320100000().down(runner);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("DROP COLUMN move_selected_to_top"),
    );
  });
});
