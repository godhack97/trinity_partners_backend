import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";

describe("AdminConfiguratorComponentService XLSX profile columns", () => {
  const makeService = (dataSource: any = {}) =>
    new AdminConfiguratorComponentService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource,
    ) as any;

  it("получает варианты полей формы из профильных таблиц", async () => {
    const query = jest.fn(async () => [
      { option_key: "currencies", value: "USD" },
      { option_key: "service_formulas", value: "fixed" },
      { option_key: "service_formulas", value: "percent_of_equipment" },
    ]);
    const service = makeService({ query });

    const result = await service.getComponentFormOptions();

    expect(result.currencies).toEqual(["USD"]);
    expect(result.service_formulas).toEqual([
      "fixed",
      "percent_of_equipment",
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("service_formulas"));
  });

  it("парсит profile.* колонки в payload нормализованных профилей", () => {
    const service = makeService();

    const profiles = service.extractProfilesFromExcelRow({
      "profile.catalog.component_type_key": "drive",
      "profile.catalog.is_active": "Да",
      "profile.catalog.warning_text": "Проверьте совместимость",
      "profile.catalog.warning_color": "#D97706",
      "profile.resource.resource_kind": "drive",
      "profile.resource.pcie_lanes": "4",
      "profile.resource.power_w": 12,
      "profile.resource.uses_power": "true",
      "profile.price.base_price": "1000",
      "profile.price.coefficient": "3.6",
      "profile.drive.drive_type": "NVME",
      "profile.drive.media_kind": "NVME",
      "profile.drive.capacity_gb": "960",
      "profile.drive.form_factor": "2.5",
      "profile.controller.m2_slot_count": "2",
      "profile.controller.supports_sas": "Нет",
      "profile.network.ports_count": "",
      "profile.gpu.memory_gb": "48",
    });

    expect(profiles).toEqual({
      catalog: {
        component_type_key: "drive",
        is_active: true,
        warning_text: "Проверьте совместимость",
        warning_color: "#D97706",
      },
      resource: {
        resource_kind: "drive",
        pcie_lanes: 4,
        power_w: 12,
        uses_power: true,
      },
      price: {
        base_price: 1000,
        coefficient: 3.6,
      },
      drive: {
        drive_type: "NVME",
        media_kind: "NVME",
        capacity_gb: 960,
        form_factor: "2.5",
      },
      controller: {
        m2_slot_count: 2,
        supports_sas: false,
      },
      gpu: {
        memory_gb: 48,
      },
    });
  });

  it("игнорирует пустые profile.* колонки и не создает пустые профили", () => {
    const service = makeService();

    const profiles = service.extractProfilesFromExcelRow({
      "profile.catalog.component_type_key": "",
      "profile.resource.pcie_lanes": null,
      "profile.cpu.ram_type": undefined,
      "profile.gpu.power_w": "",
    });

    expect(profiles).toEqual({});
  });

  it("экспортирует текущие GPU/drive/controller поля без потери значений", () => {
    const service = makeService();
    const row: Record<string, any> = {};

    service.appendProfilesToExcelRow(row, {
      drive: { media_kind: "SSD" },
      controller: { m2_slot_count: 4 },
      gpu: { memory_gb: 80 },
    });

    expect(row).toEqual(expect.objectContaining({
      "profile.drive.media_kind": "SSD",
      "profile.controller.m2_slot_count": 4,
      "profile.gpu.memory_gb": 80,
    }));
  });

  it("публикует версионированную XLSX-схему для base, slots и всех profile kinds", () => {
    const service = makeService();
    const schema = service.getExcelSchema();
    const columns = schema.map((item: any) => item.column);

    expect(columns).toEqual(expect.arrayContaining([
      "ID",
      "Действие",
      "Название",
      "Описание",
      "Слот[5]",
      "Количество[5]",
      "Увеличение[5]",
      "profile.catalog.component_type_key",
      "profile.catalog.warning_text",
      "profile.catalog.warning_color",
      "profile.resource.resource_kind",
      "profile.price.base_price",
      "profile.cpu.ram_type",
      "profile.ram.capacity_gb",
      "profile.drive.media_kind",
      "profile.controller.m2_slot_count",
      "profile.network.network_kind",
      "profile.gpu.memory_gb",
      "profile.transceiver.speed_gbps",
      "profile.psu.efficiency_class",
      "profile.service.service_level",
    ]));
    expect(new Set(columns).size).toBe(columns.length);
  });
});
