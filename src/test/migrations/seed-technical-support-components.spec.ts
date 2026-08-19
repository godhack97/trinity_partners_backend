import { QueryRunner } from "typeorm";
import { SeedTechnicalSupportComponents1780318000000 } from "../../migrations/1780318000000-SeedTechnicalSupportComponents";

describe("SeedTechnicalSupportComponents1780318000000", () => {
  it("creates the support type and five catalog components with profiles", async () => {
    const queries: Array<{ sql: string; parameters?: unknown[] }> = [];
    const runner = {
      query: jest.fn(async (sql: string, parameters?: unknown[]) => {
        queries.push({ sql: sql.replace(/\s+/gu, " ").trim(), parameters });
      }),
    } as unknown as QueryRunner;

    await new SeedTechnicalSupportComponents1780318000000().up(runner);

    expect(queries[0].parameters).toEqual([
      "warranty-type-id",
      "Техподдержка",
    ]);
    expect(queries[1].sql).toContain(
      "UPDATE cnf_component_catalog_profiles catalog",
    );
    expect(
      queries.filter(({ sql }) => sql.includes("INSERT INTO cnf_components")),
    ).toHaveLength(5);
    expect(
      queries.filter(({ sql }) =>
        sql.includes("INSERT INTO cnf_service_profiles"),
      ),
    ).toHaveLength(5);
    expect(queries.some(({ parameters }) => parameters?.includes(10))).toBe(true);
    expect(queries.some(({ parameters }) => parameters?.includes(17))).toBe(true);
    expect(queries.some(({ parameters }) => parameters?.includes(25))).toBe(true);
  });

  it("removes only seeded components and restores the legacy type name", async () => {
    const queries: Array<{ sql: string; parameters?: unknown[] }> = [];
    const runner = {
      query: jest.fn(async (sql: string, parameters?: unknown[]) => {
        queries.push({ sql: sql.replace(/\s+/gu, " ").trim(), parameters });
      }),
    } as unknown as QueryRunner;

    await new SeedTechnicalSupportComponents1780318000000().down(runner);

    expect(queries).toHaveLength(3);
    expect(queries[0].sql).toContain("DELETE FROM cnf_components WHERE id IN");
    expect(queries[0].parameters).toHaveLength(5);
    expect(queries[1].sql).toContain(
      "SET catalog.is_active = 1, catalog.disabled_reason = NULL",
    );
    expect(queries[2].parameters).toEqual([
      "Гарантия",
      "warranty-type-id",
    ]);
  });
});
