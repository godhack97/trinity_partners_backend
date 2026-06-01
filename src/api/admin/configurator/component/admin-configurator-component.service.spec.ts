import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";

describe("AdminConfiguratorComponentService XLSX profile columns", () => {
  const makeService = () =>
    new AdminConfiguratorComponentService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    ) as any;

  it("парсит profile.* колонки в payload нормализованных профилей", () => {
    const service = makeService();

    const profiles = service.extractProfilesFromExcelRow({
      "profile.catalog.component_type_key": "drive",
      "profile.catalog.is_active": "Да",
      "profile.resource.resource_kind": "drive",
      "profile.resource.pcie_lanes": "4",
      "profile.resource.power_w": 12,
      "profile.resource.uses_power": "true",
      "profile.price.base_price": "1000",
      "profile.price.coefficient": "3.6",
      "profile.drive.drive_type": "NVME",
      "profile.drive.capacity_gb": "960",
      "profile.drive.form_factor": "2.5",
      "profile.controller.supports_sas": "Нет",
      "profile.network.ports_count": "",
    });

    expect(profiles).toEqual({
      catalog: {
        component_type_key: "drive",
        is_active: true,
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
        capacity_gb: 960,
        form_factor: "2.5",
      },
      controller: {
        supports_sas: false,
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
});
