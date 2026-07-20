import * as XLSX from "xlsx";
import { CONFIGURATOR_COMPONENT_SCHEMA_VERSION } from "./configurator-component-schema";
import { XlsxService } from "./xlsx.service";

describe("XlsxService configurator schema", () => {
  const service = new XlsxService();

  it("exports and reads the versioned Components/Schema workbook", async () => {
    const buffer = await service.createXlsxFile(
      [{ ID: "component-1", Название: "GPU" }],
      [{
        column: "profile.gpu.memory_gb",
        type: "number",
        required: "Зависит от profile kind",
        description: "GPU memory",
      }],
    );
    const workbook = XLSX.read(buffer, { type: "buffer" });

    expect(workbook.SheetNames).toEqual(["Components", "Schema"]);
    expect(workbook.Sheets.Schema.B1.v).toBe(
      CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
    );

    const parsed = await service.parseXlsxFile({ buffer } as any);
    expect(parsed.schemaVersion).toBe(CONFIGURATOR_COMPONENT_SCHEMA_VERSION);
    expect(parsed.components).toEqual([
      { ID: "component-1", Название: "GPU" },
    ]);
  });

  it("keeps legacy workbooks without a Schema sheet importable as v1", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([{ Название: "Legacy GPU" }]),
      "Components",
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const parsed = await service.parseXlsxFile({ buffer } as any);
    expect(parsed.schemaVersion).toBe(1);
  });
});
