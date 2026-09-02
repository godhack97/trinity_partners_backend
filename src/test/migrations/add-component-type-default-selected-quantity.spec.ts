import { QueryRunner } from "typeorm";
import { AddComponentTypeDefaultSelectedQuantity1780320500000 } from "../../migrations/1780320500000-AddComponentTypeDefaultSelectedQuantity";

describe("AddComponentTypeDefaultSelectedQuantity1780320500000", () => {
  it("uses one by default and preserves two-item defaults", async () => {
    const queries: Array<{ sql: string; parameters?: unknown[] }> = [];
    const runner = {
      query: jest.fn(async (sql: string, parameters?: unknown[]) => {
        queries.push({ sql: sql.replace(/\s+/gu, " ").trim(), parameters });
      }),
    } as unknown as QueryRunner;

    await new AddComponentTypeDefaultSelectedQuantity1780320500000().up(
      runner,
    );

    expect(queries[0].sql).toContain(
      "ADD COLUMN default_selected_quantity int NOT NULL DEFAULT 1",
    );
    expect(queries[1].sql).toContain("SET default_selected_quantity = 2");
    expect(queries[1].parameters).toEqual([
      "cpu-type-id",
      "ram-type-id",
      "psu-type-id",
    ]);
  });

  it("removes the setting on rollback", async () => {
    const query = jest.fn();
    const runner = { query } as unknown as QueryRunner;

    await new AddComponentTypeDefaultSelectedQuantity1780320500000().down(
      runner,
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("DROP COLUMN default_selected_quantity"),
    );
  });
});
