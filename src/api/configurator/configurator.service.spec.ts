import { ConfiguratorService } from "./configurator.service";
import {
  CnfComponentCatalogProfileEntity,
  CnfComponentPriceProfileEntity,
  CnfComponentResourceProfileEntity,
  CnfControllerProfileEntity,
  CnfCpuProfileEntity,
  CnfDriveProfileEntity,
  CnfGpuProfileEntity,
  CnfNetworkProfileEntity,
  CnfPlatformBayEntity,
  CnfPlatformForbiddenComponentTypeEntity,
  CnfPlatformProfileEntity,
  CnfPsuProfileEntity,
  CnfRamProfileEntity,
  CnfServiceProfileEntity,
  CnfTransceiverCompatibilityRuleEntity,
  CnfTransceiverProfileEntity,
} from "@orm/entities";

const SERVER_ID = "server-er220hdr-m8";

const baseServer = {
  id: SERVER_ID,
  name: "ER220HDR-M8",
  server_generation_id: "gen-m8",
  price: 1000,
};

const basePlatformProfile = {
  id: "platform-profile-er220hdr-m8",
  server_id: SERVER_ID,
  platform_code: "ER220HDR-M8",
  family: "ER220",
  mode: "standard",
  cpu_limit: 2,
  ram_type: "DDR5",
  pcie_lanes_total: 160,
  rear_pcie_ocp_limit: 96,
  pcie_slots: 6,
  ocp_slots: 1,
  base_power_w: 360,
  direct_sata_limit: 12,
  internal_m2_bays: 2,
  is_active: true,
};

const baseBays = [
  {
    id: "front-bays",
    platform_profile_id: basePlatformProfile.id,
    placement: "front",
    bay_kind: "drive",
    form_factor: "2.5",
    capacity: 12,
    allowed_drive_types: ["SATA", "SAS", "NVME"],
    pcie_lanes_per_nvme: 4,
    counts_to_rear_pcie: false,
  },
];

const component = (id: string, type_id: string, name: string, price = 10) => ({
  id,
  type_id,
  name,
  price,
  server_generation_id: "gen-m8",
  processor_generation_id: null,
});

const baseComponents = {
  cpu: component("cpu-1", "cpu-type-id", "Intel Xeon 2S"),
  ram: component("ram-1", "ram-type-id", "DDR5 64GB"),
  drive: component("drive-1", "memory-type-id", "SATA SSD"),
  psu: component("psu-1", "psu-type-id", "1200W PSU"),
  gpu: component("gpu-1", "gpu-type-id", "GPU"),
  gpu2: component("gpu-2", "gpu-type-id", "GPU B"),
  ocp: component("ocp-1", "ocp-type-id", "OCP NIC"),
  transceiver: component("transceiver-1", "transiver-type-id", "SFP+ 10G SR"),
  hba: component("hba-1", "hba-type-id", "HBA 16i"),
  vroc: component("vroc-1", "raid-controller-type-id", "Intel VROC"),
  sataDrive: component("drive-sata-1", "memory-type-id", "SATA SSD"),
};

const baseRows = () =>
  new Map<any, any[]>([
    [CnfPlatformProfileEntity, [basePlatformProfile]],
    [CnfPlatformBayEntity, baseBays],
    [CnfPlatformForbiddenComponentTypeEntity, []],
    [
      CnfComponentCatalogProfileEntity,
      [
        {
          component_id: baseComponents.cpu.id,
          component_type_key: "cpu",
          server_generation_id: "gen-m8",
          is_active: true,
        },
        {
          component_id: baseComponents.ram.id,
          component_type_key: "ram",
          is_active: true,
        },
        {
          component_id: baseComponents.drive.id,
          component_type_key: "drive",
          is_active: true,
        },
        {
          component_id: baseComponents.psu.id,
          component_type_key: "psu",
          is_active: true,
        },
      ],
    ],
    [
      CnfComponentResourceProfileEntity,
      [
        {
          component_id: baseComponents.cpu.id,
          resource_kind: "cpu",
          pcie_lanes: 0,
          rear_pcie_lanes: 0,
          physical_slots: 0,
          ocp_slots: 0,
          power_w: 250,
          uses_power: true,
        },
        {
          component_id: baseComponents.ram.id,
          resource_kind: "ram",
          pcie_lanes: 0,
          rear_pcie_lanes: 0,
          physical_slots: 0,
          ocp_slots: 0,
          power_w: 8,
          uses_power: true,
        },
        {
          component_id: baseComponents.drive.id,
          resource_kind: "drive",
          pcie_lanes: 0,
          rear_pcie_lanes: 0,
          physical_slots: 0,
          ocp_slots: 0,
          power_w: 12,
          uses_power: true,
        },
        {
          component_id: baseComponents.psu.id,
          resource_kind: "psu",
          pcie_lanes: 0,
          rear_pcie_lanes: 0,
          physical_slots: 0,
          ocp_slots: 0,
          power_w: 0,
          uses_power: false,
        },
      ],
    ],
    [CnfComponentPriceProfileEntity, []],
    [CnfGpuProfileEntity, []],
    [CnfNetworkProfileEntity, []],
    [CnfTransceiverCompatibilityRuleEntity, []],
    [CnfTransceiverProfileEntity, []],
    [CnfServiceProfileEntity, []],
    [
      CnfCpuProfileEntity,
      [
        {
          component_id: baseComponents.cpu.id,
          socket_profile: "2S",
          ram_type: "DDR5",
          tdp_w: 250,
          memory_channels: 8,
          max_ram_modules_per_cpu: 16,
          max_ram_gb_per_cpu: 2048,
          memory_speed_1dpc: 5600,
          memory_speed_2dpc: 4800,
        },
      ],
    ],
    [
      CnfRamProfileEntity,
      [
        {
          component_id: baseComponents.ram.id,
          ram_type: "DDR5",
          capacity_gb: 64,
          frequency_mhz: 5600,
          rank: null,
          form_factor: "RDIMM",
        },
      ],
    ],
    [
      CnfDriveProfileEntity,
      [
        {
          component_id: baseComponents.drive.id,
          drive_type: "SATA",
          interface_type: "SATA",
          form_factor: "2.5",
          capacity_gb: 960,
          pcie_lanes: 0,
          power_w: 12,
        },
      ],
    ],
    [CnfControllerProfileEntity, []],
    [
      CnfPsuProfileEntity,
      [
        {
          component_id: baseComponents.psu.id,
          power_w: 1200,
          efficiency_class: "Platinum",
        },
      ],
    ],
  ]);

const getInValues = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?._value)) return value._value;
  if (Array.isArray(value?.value)) return value.value;
  return null;
};

const matchesWhere = (row: any, where: Record<string, any> = {}) => {
  return Object.entries(where).every(([key, value]) => {
    const inValues = getInValues(value);
    if (inValues) return inValues.includes(row[key]);
    return row[key] === value;
  });
};

const makeService = ({
  server = baseServer,
  components = Object.values(baseComponents),
  rows = baseRows(),
}: {
  server?: any;
  components?: any[];
  rows?: Map<any, any[]>;
} = {}) => {
  const cnfServerRepository = {
    findOne: jest.fn().mockResolvedValue(server),
  };
  const cnfComponentRepository = {
    find: jest.fn().mockResolvedValue(components),
  };
  const dataSource = {
    getRepository: jest.fn((entity: any) => {
      const entityRows = rows.get(entity) || [];

      return {
        findOne: jest.fn(({ where }) =>
          Promise.resolve(entityRows.find((row) => matchesWhere(row, where)) || null),
        ),
        find: jest.fn(({ where } = {}) =>
          Promise.resolve(
            where
              ? entityRows.filter((row) => matchesWhere(row, where))
              : entityRows,
          ),
        ),
      };
    }),
  };

  const service = new ConfiguratorService(
    cnfServerRepository as any,
    cnfComponentRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    dataSource as any,
  );

  return { service, mocks: { cnfServerRepository, cnfComponentRepository, dataSource } };
};

const baseDto = (overrides: Record<string, any> = {}) => ({
  server_id: SERVER_ID,
  items: [
    { component_id: baseComponents.cpu.id, qty: 1 },
    { component_id: baseComponents.ram.id, qty: 4 },
    { component_id: baseComponents.drive.id, qty: 1 },
    { component_id: baseComponents.psu.id, qty: 2 },
  ],
  support: { id: "standard", name: "Standard 3 года", years: 3 },
  ...overrides,
});

const codes = (items: Array<{ code: string }>) => items.map((item) => item.code);

describe("ConfiguratorService.validateConfiguration", () => {
  it("сортирует диски по фактической емкости GB/TB", () => {
    const { service } = makeService();
    const drive = (id: string, name: string, capacity_gb = 0) => ({
      id,
      name,
      type_id: "memory-type-id",
      profile: {
        drive: {
          drive_type: "SATA",
          interface_type: "SATA",
          form_factor: "2.5",
          capacity_gb,
          workload_class: "mixed",
        },
      },
    });

    const result = (service as any).sortPublicComponents([
      drive("d10tb", "SATA SSD 10TB"),
      drive("d960", "SATA SSD 960GB"),
      drive("dunknown", "SATA SSD capacity unknown"),
      drive("d384", "SATA SSD 3.84TB"),
      drive("d480", "SATA SSD 480GB"),
      drive("d192", "SATA SSD 1,92ТБ"),
      drive("d160", "SATA SSD 1.6Tb"),
    ]);

    expect(result.map((item) => item.id)).toEqual([
      "d480",
      "d960",
      "d160",
      "d192",
      "d384",
      "d10tb",
      "dunknown",
    ]);
  });

  it("показывает итоговую цену, если выбраны платформа, CPU, RAM, диск и сервис", async () => {
    const { service } = makeService();

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).not.toContain("REQUIRED_COMPONENT_MISSING");
    expect(result.price.is_visible).toBe(true);
    expect(result.price.service_total).toBe(0);
  });

  it("берет выбранную техподдержку и ее цену из компонентного каталога", async () => {
    const legacySupportComponent = component(
      "support-standard-legacy",
      "warranty-type-id",
      "Legacy standard",
      1,
    );
    const supportComponent = component(
      "support-standard-1",
      "warranty-type-id",
      "Стандартная гарантия",
      75,
    );
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: legacySupportComponent.id,
        component_type_key: "service",
        is_active: false,
      },
      {
        component_id: supportComponent.id,
        component_type_key: "service",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []),
      {
        component_id: supportComponent.id,
        resource_kind: "service",
        pcie_lanes: 0,
        rear_pcie_lanes: 0,
        physical_slots: 0,
        ocp_slots: 0,
        power_w: null,
        uses_power: false,
      },
    ]);
    rows.set(CnfComponentPriceProfileEntity, [
      {
        component_id: legacySupportComponent.id,
        base_price: 1,
        coefficient: 1,
        price_required: false,
      },
      {
        component_id: supportComponent.id,
        base_price: 125,
        coefficient: 1,
        price_required: false,
      },
    ]);
    rows.set(CnfServiceProfileEntity, [
      {
        component_id: legacySupportComponent.id,
        service_level: "standard",
        years: 1,
        formula: "fixed",
        percent: null,
        fixed_price: 1,
      },
      {
        component_id: supportComponent.id,
        service_level: "standard",
        years: 3,
        formula: "fixed",
        percent: null,
        fixed_price: null,
      },
    ]);
    const { service } = makeService({
      components: [
        ...Object.values(baseComponents),
        legacySupportComponent,
        supportComponent,
      ],
      rows,
    });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(result.price.service_total).toBe(125);
    expect(result.normalized_configuration.items).toContainEqual(
      expect.objectContaining({ component_id: supportComponent.id, qty: 1 }),
    );
  });

  it("для Premium передает цену поддержки на ручной расчет", async () => {
    const premiumSupport = component(
      "support-premium-1",
      "warranty-type-id",
      "Премиум",
      0,
    );
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: premiumSupport.id,
        component_type_key: "service",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []),
      {
        component_id: premiumSupport.id,
        resource_kind: "service",
        pcie_lanes: 0,
        rear_pcie_lanes: 0,
        physical_slots: 0,
        ocp_slots: 0,
        power_w: null,
        uses_power: false,
      },
    ]);
    rows.set(CnfServiceProfileEntity, [
      {
        component_id: premiumSupport.id,
        service_level: "premium",
        years: 1,
        formula: "manual",
        percent: null,
        fixed_price: null,
      },
    ]);
    const { service } = makeService({
      components: [...Object.values(baseComponents), premiumSupport],
      rows,
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          ...baseDto().items,
          { component_id: premiumSupport.id, qty: 1 },
        ],
        support: undefined,
      }) as any,
    );

    expect(result.price.is_visible).toBe(false);
    expect(result.price.equipment_subtotal).toBeNull();
    expect(result.price.service_total).toBeNull();
    expect(result.price.total).toBeNull();
    expect(result.price.visibility_reason).toContain("ручного расчета");
    expect(codes(result.warnings)).toContain("PREMIUM_SERVICE_MANAGER_REQUIRED");
    expect(result.normalized_configuration.items).toContainEqual(
      expect.objectContaining({ component_id: premiumSupport.id, qty: 1 }),
    );
  });

  it("не считает legacy-компонент сервиса повторно при переданном support", async () => {
    const legacyService = component(
      "legacy-service-1",
      "service-type-id",
      "Гарантия на сервер",
      100,
    );
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: legacyService.id,
        component_type_key: "service",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []),
      {
        component_id: legacyService.id,
        resource_kind: "service",
        pcie_lanes: 0,
        rear_pcie_lanes: 0,
        physical_slots: 0,
        ocp_slots: 0,
        power_w: 0,
        uses_power: false,
      },
    ]);
    rows.set(CnfServiceProfileEntity, [
      {
        component_id: legacyService.id,
        service_level: "extended",
        years: 1,
        formula: "percent_of_equipment",
        percent: 10,
        fixed_price: null,
      },
    ]);
    const { service } = makeService({
      components: [...Object.values(baseComponents), legacyService],
      rows,
    });
    const items = [
      ...baseDto().items,
      { component_id: legacyService.id, qty: 1 },
    ];

    const withSupport = await service.validateConfiguration(
      baseDto({
        items,
        support: {
          id: "standard",
          name: "Техподдержка 3 года",
          years: 3,
          price: 25,
        },
      }) as any,
    );
    const legacyOnly = await service.validateConfiguration(
      baseDto({ items, support: undefined }) as any,
    );

    expect(withSupport.price.is_visible).toBe(true);
    expect(withSupport.price.service_total).toBe(25);
    expect(withSupport.normalized_configuration.items).not.toContainEqual(
      expect.objectContaining({ component_id: legacyService.id }),
    );
    expect(codes(withSupport.warnings)).not.toContain("SERVICE_PRICE_RECALCULATED");
    expect(legacyOnly.normalized_configuration.items).toContainEqual(
      expect.objectContaining({ component_id: legacyService.id }),
    );
    expect(legacyOnly.price.equipment_subtotal).toBe(1236);
    expect(legacyOnly.price.service_total).toBe(123.6);
    expect(legacyOnly.price.total).toBe(1359.6);
    expect(codes(legacyOnly.warnings)).toContain("SERVICE_PRICE_RECALCULATED");
  });

  it("блокирует расчет стоимости, если выбрано меньше двух модулей RAM", async () => {
    const { service } = makeService();

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 1 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    const requiredError = result.errors.find(
      (error) => error.code === "REQUIRED_COMPONENT_MISSING",
    );

    expect(requiredError?.details.missing).toContain("ram");
    expect(requiredError?.details.selected.ram_modules).toBe(1);
    expect(requiredError?.level).toBe("error");
    expect(result.price.is_visible).toBe(false);
  });

  it("блокирует количество CPU больше 1 для socket_profile 1S", async () => {
    const rows = baseRows();
    rows.set(CnfCpuProfileEntity, [
      {
        component_id: baseComponents.cpu.id,
        socket_profile: "1S",
        ram_type: "DDR5",
        tdp_w: 250,
        memory_channels: 8,
        max_ram_modules_per_cpu: 16,
        max_ram_gb_per_cpu: 2048,
        memory_speed_1dpc: 5600,
        memory_speed_2dpc: 4800,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 2 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("CPU_1S_QTY_EXCEEDED");
  });

  it("фиксирует RAM mismatch, 2DPC и downclock как отдельные сигналы", async () => {
    const rows = baseRows();
    rows.set(CnfRamProfileEntity, [
      {
        component_id: baseComponents.ram.id,
        ram_type: "DDR4",
        capacity_gb: 64,
        frequency_mhz: 5600,
        rank: null,
        form_factor: "RDIMM",
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 10 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("RAM_TYPE_MISMATCH");
    expect(codes(result.warnings)).toContain("RAM_2DPC");
    expect(codes(result.warnings)).toContain("RAM_DOWNCLOCK");
    expect(result.warnings.find((warning) => warning.code === "RAM_2DPC")?.level).toBe("warning");
  });

  it("требует аппаратный RAID/HBA для SAS-дисков", async () => {
    const rows = baseRows();
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SAS",
        interface_type: "SAS",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).toContain("SAS_REQUIRES_RAID");
    expect(codes(result.errors)).toContain("SAS_SATA_CONTROLLER_REQUIRED");
    expect(result.resources.sas_sata_controller_ports).toEqual({ used: 1, limit: 0 });
  });

  it("оставляет manual SAS-диски в normalized configuration без контроллера", async () => {
    const rows = baseRows();
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SAS",
        interface_type: "SAS",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1, source: "manual" },
          { component_id: baseComponents.ram.id, qty: 4, source: "manual" },
          { component_id: baseComponents.drive.id, qty: 2, source: "manual" },
          { component_id: baseComponents.psu.id, qty: 2, source: "manual" },
        ],
      }) as any,
    );

    expect(result.normalized_configuration.items).toEqual(
      expect.arrayContaining([
        { component_id: baseComponents.drive.id, qty: 2, source: "manual" },
      ]),
    );
    expect(codes(result.errors)).toContain("SAS_REQUIRES_RAID");
  });

  it("dry-run удаления HBA оставляет SAS-диски и показывает ошибки после удаления", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.hba.id,
        component_type_key: "hba",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SAS",
        interface_type: "SAS",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    rows.set(CnfControllerProfileEntity, [
      {
        component_id: baseComponents.hba.id,
        controller_type: "HBA",
        pcie_lanes: 8,
        rear_pcie_lanes: 8,
        physical_slots: 1,
        internal_ports: 8,
        supports_sata: false,
        supports_sas: true,
        supports_nvme: false,
        power_w: 15,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.dryRunRemoveComponent(
      baseDto({
        remove_component_id: baseComponents.hba.id,
        items: [
          { component_id: baseComponents.cpu.id, qty: 1, source: "manual" },
          { component_id: baseComponents.ram.id, qty: 4, source: "manual" },
          { component_id: baseComponents.drive.id, qty: 2, source: "manual" },
          { component_id: baseComponents.hba.id, qty: 1, source: "manual" },
          { component_id: baseComponents.psu.id, qty: 2, source: "manual" },
        ],
      }) as any,
    );

    expect(result.removed_items).toEqual([
      { component_id: baseComponents.hba.id, qty: 1, source: "manual" },
    ]);
    expect(result.retained_items).toEqual(
      expect.arrayContaining([
        { component_id: baseComponents.drive.id, qty: 2, source: "manual" },
      ]),
    );
    expect(codes(result.invalid_after_removal)).toContain("SAS_REQUIRES_RAID");
    expect(codes(result.validation.errors)).toContain("SAS_REQUIRES_RAID");
  });

  it("не требует контроллер для SATA-дисков в пределах direct-limit", async () => {
    const { service } = makeService();

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 4 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).not.toContain("SAS_SATA_CONTROLLER_REQUIRED");
    expect(codes(result.errors)).not.toContain("SAS_SATA_CONTROLLER_CAPACITY_EXCEEDED");
    expect(result.resources.sata_direct_ports).toEqual({ used: 4, limit: 12 });
    expect(result.resources.sas_sata_controller_ports).toEqual({ used: 0, limit: 0 });
  });

  it("требует порт контроллера для SATA сверх direct-limit", async () => {
    const { service } = makeService();

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 13 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("SAS_SATA_CONTROLLER_REQUIRED");
    expect(result.resources.sata_direct_ports).toEqual({ used: 12, limit: 12 });
    expect(result.resources.sas_sata_controller_ports).toEqual({ used: 1, limit: 0 });
  });

  it("не считает VROC контроллером для SAS-дисков", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.vroc.id,
        component_type_key: "vroc",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []),
      {
        component_id: baseComponents.vroc.id,
        resource_kind: "none",
        pcie_lanes: 0,
        rear_pcie_lanes: 0,
        physical_slots: 0,
        ocp_slots: 0,
        power_w: 0,
        uses_power: false,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SAS",
        interface_type: "SAS",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    rows.set(CnfControllerProfileEntity, [
      {
        component_id: baseComponents.vroc.id,
        controller_type: "VROC",
        pcie_lanes: 0,
        rear_pcie_lanes: 0,
        physical_slots: 0,
        internal_ports: 24,
        supports_sata: false,
        supports_sas: true,
        supports_nvme: true,
        power_w: 0,
      },
    ]);
    const { service } = makeService({
      components: [...Object.values(baseComponents)],
      rows,
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.vroc.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("SAS_REQUIRES_RAID");
    expect(codes(result.errors)).toContain("SAS_SATA_CONTROLLER_REQUIRED");
  });

  it("разрешает SAS-диски при наличии HBA с внутренними SAS-портами", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.hba.id,
        component_type_key: "hba",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []),
      {
        component_id: baseComponents.hba.id,
        resource_kind: "pcie_card",
        pcie_lanes: 8,
        rear_pcie_lanes: 8,
        physical_slots: 1,
        ocp_slots: 0,
        power_w: 15,
        uses_power: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SAS",
        interface_type: "SAS",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    rows.set(CnfControllerProfileEntity, [
      {
        component_id: baseComponents.hba.id,
        controller_type: "HBA",
        pcie_lanes: 8,
        rear_pcie_lanes: 8,
        physical_slots: 1,
        internal_ports: 8,
        supports_sata: true,
        supports_sas: true,
        supports_nvme: false,
        power_w: 15,
      },
    ]);
    const { service } = makeService({
      components: [...Object.values(baseComponents)],
      rows,
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.hba.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).not.toContain("SAS_REQUIRES_RAID");
    expect(codes(result.errors)).not.toContain("SAS_SATA_CONTROLLER_REQUIRED");
    expect(codes(result.errors)).not.toContain("SAS_SATA_CONTROLLER_CAPACITY_EXCEEDED");
    expect(result.resources.sas_sata_controller_ports).toEqual({ used: 1, limit: 8 });
  });

  it("считает PSU по N+1: один блок дает warning, перегруз одного блока дает error", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        base_power_w: 1000,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []).map((profile) =>
        profile.component_id === baseComponents.psu.id
          ? {
              ...profile,
              power_w: 1200,
              uses_power: false,
            }
          : profile,
      ),
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 1 },
        ],
      }) as any,
    );

    expect(codes(result.warnings)).toContain("ONLY_ONE_PSU_SELECTED");
    expect(codes(result.errors)).toContain("POWER_EXCEEDED");
    expect(result.resources.power_w.used).toBe(1294);
    expect(result.resources.power_w.limit).toBe(1200);
  });

  it("блокирует типы компонентов, запрещенные профилем платформы", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformForbiddenComponentTypeEntity, [
      {
        platform_profile_id: basePlatformProfile.id,
        component_type_key: "drive",
        reason: "Профиль платформы не допускает дисковые компоненты этого типа",
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).toContain("COMPONENT_FORBIDDEN_ON_PLATFORM");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "COMPONENT_FORBIDDEN_ON_PLATFORM",
          details: expect.objectContaining({
            component_id: baseComponents.drive.id,
            component_type_key: "drive",
          }),
        }),
      ]),
    );
  });

  it("использует специализированный GPU-профиль как fallback ресурсного профиля", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.gpu.id,
        component_type_key: "gpu",
        is_active: true,
      },
    ]);
    rows.set(CnfGpuProfileEntity, [
      {
        component_id: baseComponents.gpu.id,
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 2,
        power_w: 300,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
          { component_id: baseComponents.gpu.id, qty: 1 },
        ],
      }) as any,
    );

    expect(result.resources.pcie_total.used).toBe(16);
    expect(result.resources.rear_pcie_ocp.used).toBe(16);
    expect(result.resources.pcie_slots.used).toBe(2);
    expect(result.resources.power_w.used).toBe(954);
    expect(codes(result.warnings)).toContain("GPU_WARRANTY_MANAGER_REQUIRED");
  });

  it("суммирует ресурсы нескольких разных GPU-моделей", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.gpu.id,
        component_type_key: "gpu",
        is_active: true,
      },
      {
        component_id: baseComponents.gpu2.id,
        component_type_key: "gpu",
        is_active: true,
      },
    ]);
    rows.set(CnfGpuProfileEntity, [
      {
        component_id: baseComponents.gpu.id,
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 2,
        power_w: 300,
      },
      {
        component_id: baseComponents.gpu2.id,
        pcie_lanes: 8,
        rear_pcie_lanes: 8,
        physical_slots: 1,
        power_w: 150,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
          { component_id: baseComponents.gpu.id, qty: 1 },
          { component_id: baseComponents.gpu2.id, qty: 1 },
        ],
      }) as any,
    );

    expect(result.resources.pcie_total.used).toBe(24);
    expect(result.resources.rear_pcie_ocp.used).toBe(24);
    expect(result.resources.pcie_slots.used).toBe(3);
    expect(result.resources.power_w.used).toBe(1104);
    expect(codes(result.errors)).not.toContain("GPU_COUNT_LIMIT_EXCEEDED");
  });

  it("блокирует суммарно больше 8 GPU для TSGM240", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "TSGM240-M8",
        family: "TSGM240",
        pcie_lanes_total: 999,
        rear_pcie_ocp_limit: 999,
        pcie_slots: 999,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.gpu.id,
        component_type_key: "gpu",
        is_active: true,
      },
      {
        component_id: baseComponents.gpu2.id,
        component_type_key: "gpu",
        is_active: true,
      },
    ]);
    rows.set(CnfGpuProfileEntity, [
      {
        component_id: baseComponents.gpu.id,
        pcie_lanes: 1,
        rear_pcie_lanes: 1,
        physical_slots: 0,
        power_w: 10,
      },
      {
        component_id: baseComponents.gpu2.id,
        pcie_lanes: 1,
        rear_pcie_lanes: 1,
        physical_slots: 0,
        power_w: 10,
      },
    ]);
    const { service } = makeService({
      server: { ...baseServer, name: "TSGM240-M8" },
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
          { component_id: baseComponents.gpu.id, qty: 5 },
          { component_id: baseComponents.gpu2.id, qty: 4 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("GPU_COUNT_LIMIT_EXCEEDED");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "GPU_COUNT_LIMIT_EXCEEDED",
          details: expect.objectContaining({ used: 9, limit: 8 }),
        }),
      ]),
    );
  });

  it("считает PCIe total и Rear PCIe/OCP по количеству CPU для ER220HDR-M7", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER220HDR-M7",
        ram_type: "DDR4",
        pcie_lanes_per_cpu: 64,
        pcie_lanes_total: 128,
        rear_pcie_ocp_limit: 96,
      },
    ]);
    rows.set(CnfCpuProfileEntity, [
      {
        component_id: baseComponents.cpu.id,
        socket_profile: "2S",
        ram_type: "DDR4",
        tdp_w: 250,
        memory_channels: 8,
        max_ram_modules_per_cpu: 16,
        max_ram_gb_per_cpu: 2048,
        memory_speed_1dpc: 3200,
        memory_speed_2dpc: 2933,
      },
    ]);
    rows.set(CnfRamProfileEntity, [
      {
        component_id: baseComponents.ram.id,
        ram_type: "DDR4",
        capacity_gb: 64,
        frequency_mhz: 3200,
        rank: null,
        form_factor: "RDIMM",
      },
    ]);
    const { service } = makeService({ rows });

    const oneCpuResult = await service.validateConfiguration(baseDto() as any);
    const twoCpuResult = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 2 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(oneCpuResult.resources.pcie_total.limit).toBe(64);
    expect(oneCpuResult.resources.rear_pcie_ocp.limit).toBe(48);
    expect(twoCpuResult.resources.pcie_total.limit).toBe(128);
    expect(twoCpuResult.resources.rear_pcie_ocp.limit).toBe(96);
  });

  it("считает PCIe total и Rear PCIe/OCP по количеству CPU для ER220HDR-M8", async () => {
    const { service } = makeService();

    const oneCpuResult = await service.validateConfiguration(baseDto() as any);
    const twoCpuResult = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 2 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(oneCpuResult.resources.pcie_total.limit).toBe(80);
    expect(oneCpuResult.resources.rear_pcie_ocp.limit).toBe(48);
    expect(twoCpuResult.resources.pcie_total.limit).toBe(160);
    expect(twoCpuResult.resources.rear_pcie_ocp.limit).toBe(96);
  });

  it("пересчитывает ошибки PCIe после добавления второго CPU", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.gpu.id,
        component_type_key: "gpu",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []),
      {
        component_id: baseComponents.gpu.id,
        resource_kind: "gpu",
        pcie_lanes: 96,
        rear_pcie_lanes: 64,
        physical_slots: 1,
        ocp_slots: 0,
        power_w: 0,
        uses_power: false,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const oneCpuResult = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
          { component_id: baseComponents.gpu.id, qty: 1 },
        ],
      }) as any,
    );
    const twoCpuResult = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 2 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
          { component_id: baseComponents.gpu.id, qty: 1 },
        ],
      }) as any,
    );

    expect(codes(oneCpuResult.errors)).toContain("PCIE_TOTAL_LINES_EXCEEDED");
    expect(codes(oneCpuResult.errors)).toContain("REAR_PCIE_LINES_EXCEEDED");
    expect(codes(twoCpuResult.errors)).not.toContain("PCIE_TOTAL_LINES_EXCEEDED");
    expect(codes(twoCpuResult.errors)).not.toContain("REAR_PCIE_LINES_EXCEEDED");
  });

  it("для ocp_only платформы OCP не расходует rear PCIe/OCP", async () => {
    const rows = baseRows();
    const resourceRows = rows.get(CnfComponentResourceProfileEntity) || [];
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        mode: "ocp_only",
        rear_pcie_ocp_limit: 0,
        pcie_slots: 0,
        ocp_slots: 8,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.ocp.id,
        component_type_key: "ocp",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...resourceRows,
      {
        component_id: baseComponents.ocp.id,
        resource_kind: "ocp",
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 1,
        ocp_slots: 1,
        power_w: 25,
        uses_power: true,
      },
    ]);
    rows.set(CnfNetworkProfileEntity, [
      {
        component_id: baseComponents.ocp.id,
        network_kind: "ocp",
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 0,
        ocp_slots: 1,
        power_w: 25,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
          { component_id: baseComponents.ocp.id, qty: 1 },
        ],
      }) as any,
    );

    expect(result.resources.pcie_total.used).toBe(16);
    expect(result.resources.rear_pcie_ocp.used).toBe(0);
    expect(result.resources.pcie_slots.used).toBe(0);
    expect(result.resources.ocp_slots.used).toBe(1);
    expect(codes(result.errors)).not.toContain("REAR_PCIE_EXCEEDED");
  });

  it("разрешает трансивер с совпадающим connector type и скоростью", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.ocp.id,
        component_type_key: "ocp",
        is_active: true,
      },
      {
        component_id: baseComponents.transceiver.id,
        component_type_key: "transceiver",
        is_active: true,
      },
    ]);
    rows.set(CnfNetworkProfileEntity, [
      {
        component_id: baseComponents.ocp.id,
        network_kind: "ocp",
        port_type: "SFP+",
        port_speed: "10G",
        ports_count: 2,
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 0,
        ocp_slots: 1,
        power_w: 25,
      },
    ]);
    rows.set(CnfTransceiverProfileEntity, [
      {
        component_id: baseComponents.transceiver.id,
        interface_type: "SFP+",
        speed: "10G",
        media_type: "SR",
        wavelength: "850nm",
        compatible_port_type: "SFP+",
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.ocp.id, qty: 1 },
          { component_id: baseComponents.transceiver.id, qty: 2 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).not.toContain("TRANSCEIVER_INCOMPATIBLE");
  });

  it("использует нормализованные поля connector_type, speed_gbps и port_count для трансиверов", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.ocp.id,
        component_type_key: "ocp",
        is_active: true,
      },
      {
        component_id: baseComponents.transceiver.id,
        component_type_key: "transceiver",
        is_active: true,
      },
    ]);
    rows.set(CnfNetworkProfileEntity, [
      {
        component_id: baseComponents.ocp.id,
        network_kind: "ocp",
        port_type: "legacy-wrong",
        connector_type: "SFP28",
        port_speed: "10G",
        port_speed_gbps: 25,
        ports_count: 1,
        port_count: 2,
        supported_media: "optical,dac",
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 0,
        ocp_slots: 1,
        power_w: 25,
      },
    ]);
    rows.set(CnfTransceiverProfileEntity, [
      {
        component_id: baseComponents.transceiver.id,
        interface_type: "legacy-wrong",
        connector_type: "SFP28",
        speed: "10G",
        speed_gbps: 25,
        media_type: "SR",
        wavelength: "850nm",
        wavelength_or_length: "850nm",
        compatible_port_type: "legacy-wrong",
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.ocp.id, qty: 1 },
          { component_id: baseComponents.transceiver.id, qty: 2 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).not.toContain("TRANSCEIVER_INCOMPATIBLE");
  });

  it("блокирует трансивер с несовпадающей скоростью или connector type", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.ocp.id,
        component_type_key: "ocp",
        is_active: true,
      },
      {
        component_id: baseComponents.transceiver.id,
        component_type_key: "transceiver",
        is_active: true,
      },
    ]);
    rows.set(CnfNetworkProfileEntity, [
      {
        component_id: baseComponents.ocp.id,
        network_kind: "ocp",
        port_type: "SFP+",
        port_speed: "10G",
        ports_count: 2,
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 0,
        ocp_slots: 1,
        power_w: 25,
      },
    ]);
    rows.set(CnfTransceiverProfileEntity, [
      {
        component_id: baseComponents.transceiver.id,
        interface_type: "SFP28",
        speed: "25G",
        media_type: "SR",
        wavelength: "850nm",
        compatible_port_type: "SFP28",
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.ocp.id, qty: 1 },
          { component_id: baseComponents.transceiver.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("TRANSCEIVER_INCOMPATIBLE");
  });

  it("разрешает исключение совместимости трансивера через explicit compatibility rule", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.ocp.id,
        component_type_key: "ocp",
        is_active: true,
      },
      {
        component_id: baseComponents.transceiver.id,
        component_type_key: "transceiver",
        is_active: true,
      },
    ]);
    rows.set(CnfNetworkProfileEntity, [
      {
        component_id: baseComponents.ocp.id,
        network_kind: "ocp",
        connector_type: "SFP+",
        port_speed_gbps: 10,
        port_count: 2,
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 0,
        ocp_slots: 1,
        power_w: 25,
      },
    ]);
    rows.set(CnfTransceiverProfileEntity, [
      {
        component_id: baseComponents.transceiver.id,
        interface_type: "SFP28",
        connector_type: "SFP28",
        speed_gbps: 25,
        media_type: "SR",
        wavelength_or_length: "850nm",
      },
    ]);
    rows.set(CnfTransceiverCompatibilityRuleEntity, [
      {
        network_connector_type: "SFP+",
        network_speed_gbps: 10,
        transceiver_connector_type: "SFP28",
        transceiver_speed_gbps: 25,
        is_allowed: true,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.ocp.id, qty: 1 },
          { component_id: baseComponents.transceiver.id, qty: 2 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).not.toContain("TRANSCEIVER_INCOMPATIBLE");
  });

  it("не позволяет занять одни и те же сетевые порты разными трансиверами", async () => {
    const altTransceiver = component(
      "transceiver-2",
      "transiver-type-id",
      "SFP+ 10G LR",
    );
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.ocp.id,
        component_type_key: "ocp",
        is_active: true,
      },
      {
        component_id: baseComponents.transceiver.id,
        component_type_key: "transceiver",
        is_active: true,
      },
      {
        component_id: altTransceiver.id,
        component_type_key: "transceiver",
        is_active: true,
      },
    ]);
    rows.set(CnfNetworkProfileEntity, [
      {
        component_id: baseComponents.ocp.id,
        network_kind: "ocp",
        connector_type: "SFP+",
        port_speed_gbps: 10,
        port_count: 2,
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 0,
        ocp_slots: 1,
        power_w: 25,
      },
    ]);
    rows.set(CnfTransceiverProfileEntity, [
      {
        component_id: baseComponents.transceiver.id,
        connector_type: "SFP+",
        speed_gbps: 10,
        media_type: "SR",
      },
      {
        component_id: altTransceiver.id,
        connector_type: "SFP+",
        speed_gbps: 10,
        media_type: "LR",
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents), altTransceiver],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.ocp.id, qty: 1 },
          { component_id: baseComponents.transceiver.id, qty: 2 },
          { component_id: altTransceiver.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("TRANSCEIVER_INCOMPATIBLE");
  });

  it("не считает RJ45 порт совместимым с optical transceiver", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.ocp.id,
        component_type_key: "ocp",
        is_active: true,
      },
      {
        component_id: baseComponents.transceiver.id,
        component_type_key: "transceiver",
        is_active: true,
      },
    ]);
    rows.set(CnfNetworkProfileEntity, [
      {
        component_id: baseComponents.ocp.id,
        network_kind: "ocp",
        port_type: "RJ45",
        port_speed: "10G",
        ports_count: 2,
        pcie_lanes: 16,
        rear_pcie_lanes: 16,
        physical_slots: 0,
        ocp_slots: 1,
        power_w: 25,
      },
    ]);
    rows.set(CnfTransceiverProfileEntity, [
      {
        component_id: baseComponents.transceiver.id,
        interface_type: "SFP+",
        speed: "10G",
        media_type: "SR",
        wavelength: "850nm",
        compatible_port_type: "SFP+",
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.ocp.id, qty: 1 },
          { component_id: baseComponents.transceiver.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("TRANSCEIVER_INCOMPATIBLE");
  });

  it("считает PCIe для NVMe из drive profile, если resource profile не задает линии", async () => {
    const rows = baseRows();
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "NVME",
        interface_type: "NVME",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 4,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 2 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.pcie_total.used).toBe(8);
  });

  it("размещает M.2 только во внутренних M.2, а не в дисковых корзинах", async () => {
    const rows = baseRows();
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M.2",
        interface_type: "NVME",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 2 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.internal_m2).toEqual({ used: 2, limit: 2 });
    expect(result.resources.front_bays).toEqual({ used: 0, limit: 12 });
    expect(result.resources.rear_bays).toEqual({ used: 0, limit: 0 });
    expect(codes(result.errors)).not.toContain("DRIVE_BAYS_EXCEEDED");
    expect(codes(result.errors)).not.toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("принимает drive_type M2 как M.2 и ограничивает только internal M.2 slots", async () => {
    const rows = baseRows();
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "NVME",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 3 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.internal_m2).toEqual({ used: 2, limit: 2 });
    expect(result.resources.adapter_m2_slots).toEqual({ used: 0, limit: 0 });
    expect(result.resources.front_bays).toEqual({ used: 0, limit: 12 });
    expect(result.resources.rear_bays).toEqual({ used: 0, limit: 0 });
    expect(codes(result.errors)).not.toContain("DRIVE_BAY_LIMIT_EXCEEDED");
    expect(codes(result.warnings)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("учитывает M.2 слоты RAID/HBA адаптера как отдельный pool", async () => {
    const rows = baseRows();
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.hba.id,
        component_type_key: "hba",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "NVME",
        m2_interface: "NVME",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    rows.set(CnfControllerProfileEntity, [
      {
        component_id: baseComponents.hba.id,
        controller_type: "HBA",
        pcie_lanes: 8,
        rear_pcie_lanes: 8,
        physical_slots: 1,
        internal_ports: 0,
        m2_slot_count: 2,
        m2_drive_type: "NVME",
        supports_sata: false,
        supports_sas: false,
        supports_nvme: true,
        power_w: 15,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 4 },
          { component_id: baseComponents.hba.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.internal_m2).toEqual({ used: 2, limit: 2 });
    expect(result.resources.adapter_m2_slots).toEqual({ used: 2, limit: 2 });
    expect(codes(result.errors)).not.toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("не размещает M.2 SATA в NVMe-only M.2 адаптер", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        internal_m2_bays: 0,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.hba.id,
        component_type_key: "hba",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "SATA",
        m2_interface: "SATA",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    rows.set(CnfControllerProfileEntity, [
      {
        component_id: baseComponents.hba.id,
        controller_type: "HBA",
        pcie_lanes: 8,
        rear_pcie_lanes: 8,
        physical_slots: 1,
        internal_ports: 0,
        m2_slot_count: 2,
        m2_drive_type: "NVME",
        supports_sata: false,
        supports_sas: false,
        supports_nvme: true,
        power_w: 15,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.hba.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.adapter_m2_slots).toEqual({ used: 0, limit: 2 });
    expect(codes(result.errors)).not.toContain("DRIVE_BAY_LIMIT_EXCEEDED");
    expect(codes(result.warnings)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("размещает M.2 SATA и NVMe в SATA+NVMe M.2 адаптер", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        internal_m2_bays: 0,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.hba.id,
        component_type_key: "hba",
        is_active: true,
      },
      {
        component_id: baseComponents.sataDrive.id,
        component_type_key: "drive",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "NVME",
        m2_interface: "NVME",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
      {
        component_id: baseComponents.sataDrive.id,
        drive_type: "M2",
        interface_type: "SATA",
        m2_interface: "SATA",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    rows.set(CnfControllerProfileEntity, [
      {
        component_id: baseComponents.hba.id,
        controller_type: "HBA",
        pcie_lanes: 8,
        rear_pcie_lanes: 8,
        physical_slots: 1,
        internal_ports: 0,
        m2_slot_count: 2,
        m2_drive_type: "SATA+NVME",
        supports_sata: false,
        supports_sas: false,
        supports_nvme: true,
        power_w: 15,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.sataDrive.id, qty: 1 },
          { component_id: baseComponents.hba.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.adapter_m2_slots).toEqual({ used: 2, limit: 2 });
    expect(codes(result.errors)).not.toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("запрещает M.2 SATA на Gen3/M7", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER220HDR-M7",
        ram_type: "DDR4",
        pcie_generation: "GEN3",
        pcie_lanes_per_cpu: 64,
        pcie_lanes_total: 128,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "SATA",
        m2_interface: "SATA",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).toContain("M2_SATA_GEN3_FORBIDDEN");
  });

  it("разрешает M.2 NVMe на Gen3/M7", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER220HDR-M7",
        ram_type: "DDR4",
        pcie_generation: "GEN3",
        pcie_lanes_per_cpu: 64,
        pcie_lanes_total: 128,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "NVME",
        m2_interface: "NVME",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).not.toContain("M2_SATA_GEN3_FORBIDDEN");
  });

  it("разрешает M.2 SATA на Gen4/M8", async () => {
    const rows = baseRows();
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "SATA",
        m2_interface: "SATA",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).not.toContain("M2_SATA_GEN3_FORBIDDEN");
  });

  it("для HSR учитывает типы передних бэкплейнов 3x8 при смешивании NVMe и SATA/SAS", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER225HSR-M8",
        direct_sata_limit: 28,
      },
    ]);
    rows.set(CnfPlatformBayEntity, [
      {
        id: "hsr-front-nvme",
        platform_profile_id: basePlatformProfile.id,
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 8,
        allowed_drive_types: ["NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: false,
      },
      {
        id: "hsr-front-sata-sas",
        platform_profile_id: basePlatformProfile.id,
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 16,
        allowed_drive_types: ["SATA", "SAS"],
        pcie_lanes_per_nvme: null,
        counts_to_rear_pcie: false,
      },
      {
        id: "hsr-rear-mixed",
        platform_profile_id: basePlatformProfile.id,
        placement: "rear",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 4,
        allowed_drive_types: ["SATA", "SAS", "NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: true,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.sataDrive.id,
        component_type_key: "drive",
        is_active: true,
      },
    ]);
    rows.set(CnfComponentResourceProfileEntity, [
      ...(rows.get(CnfComponentResourceProfileEntity) || []),
      {
        component_id: baseComponents.sataDrive.id,
        resource_kind: "drive",
        pcie_lanes: 0,
        rear_pcie_lanes: 0,
        physical_slots: 0,
        ocp_slots: 0,
        power_w: 12,
        uses_power: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "NVME",
        interface_type: "NVME",
        form_factor: "2.5",
        capacity_gb: 1920,
        pcie_lanes: 4,
        power_w: 12,
      },
      {
        component_id: baseComponents.sataDrive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "2.5",
        capacity_gb: 1920,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({
      components: [...Object.values(baseComponents)],
      rows,
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 21 },
          { component_id: baseComponents.sataDrive.id, qty: 7 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.front_bays).toEqual({ used: 23, limit: 24 });
    expect(result.resources.rear_bays).toEqual({ used: 4, limit: 4 });
    expect(codes(result.errors)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DRIVE_BAY_LIMIT_EXCEEDED",
          details: expect.objectContaining({
            platform_rule: "HSR_FRONT_3X8_BACKPLANES",
            selected_nvme: 21,
            selected_sata_sas: 7,
            unplaced: 1,
            zones: expect.arrayContaining([
              expect.objectContaining({
                name: "Front BP1",
                mode: "NVME",
                used: 8,
                capacity: 8,
              }),
              expect.objectContaining({
                name: "Front BP2",
                mode: "NVME",
                used: 8,
                capacity: 8,
              }),
              expect.objectContaining({
                name: "Front BP3",
                mode: "SATA_SAS",
                used: 7,
                capacity: 8,
              }),
              expect.objectContaining({
                name: "Rear BP",
                mode: "MIXED",
                used: 4,
                capacity: 4,
                nvme_used: 4,
              }),
            ]),
          }),
        }),
      ]),
    );
  });

  it("считает 2.5/3.5 bay как общий лимит, а не как две независимые корзины", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        form_factor: "2.5/3.5",
        capacity: 2,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "3.5",
        capacity_gb: 1000,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 3 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.front_bays).toEqual({ used: 2, limit: 2 });
    expect(codes(result.errors)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("запрещает 3.5-диски для ER225", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER225HR-M8",
        family: "ER225",
      },
    ]);
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        platform_profile_id: basePlatformProfile.id,
        placement: "rear",
        form_factor: "2.5",
        capacity: 4,
        allowed_drive_types: ["SATA", "SAS"],
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "3.5",
        capacity_gb: 1000,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).toContain("DRIVE_FORM_FACTOR_INVALID");
  });

  it("разрешает 3.5-диски для ER220 front-bay", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        form_factor: "2.5/3.5",
        capacity: 12,
      },
      {
        ...baseBays[0],
        id: "rear-bays",
        placement: "rear",
        form_factor: "2.5",
        capacity: 4,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "3.5",
        capacity_gb: 1000,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(result.resources.front_bays).toEqual({ used: 1, limit: 12 });
    expect(result.resources.rear_bays).toEqual({ used: 0, limit: 4 });
    expect(codes(result.errors)).not.toContain("DRIVE_FORM_FACTOR_INVALID");
  });

  it("детерминированно размещает ER220 3.5 во front перед 2.5 независимо от порядка выбора", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        form_factor: "2.5/3.5",
        capacity: 12,
      },
      {
        ...baseBays[0],
        id: "rear-bays",
        placement: "rear",
        form_factor: "2.5",
        capacity: 4,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.sataDrive.id,
        component_type_key: "drive",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "3.5",
        capacity_gb: 1000,
        pcie_lanes: 0,
        power_w: 12,
      },
      {
        component_id: baseComponents.sataDrive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const firstOrder = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.sataDrive.id, qty: 5 },
          { component_id: baseComponents.drive.id, qty: 5 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );
    const secondOrder = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 5 },
          { component_id: baseComponents.sataDrive.id, qty: 5 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(firstOrder.resources.front_bays).toEqual({ used: 10, limit: 12 });
    expect(firstOrder.resources.rear_bays).toEqual({ used: 0, limit: 4 });
    expect(secondOrder.resources.front_bays).toEqual(firstOrder.resources.front_bays);
    expect(secondOrder.resources.rear_bays).toEqual(firstOrder.resources.rear_bays);
  });

  it("размещает ER220 12 x 3.5 во front и остаток 2.5 в rear", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        form_factor: "2.5/3.5",
        capacity: 12,
      },
      {
        ...baseBays[0],
        id: "rear-bays",
        placement: "rear",
        form_factor: "2.5",
        capacity: 4,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.sataDrive.id,
        component_type_key: "drive",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "3.5",
        capacity_gb: 1000,
        pcie_lanes: 0,
        power_w: 12,
      },
      {
        component_id: baseComponents.sataDrive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 12 },
          { component_id: baseComponents.sataDrive.id, qty: 4 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.front_bays).toEqual({ used: 12, limit: 12 });
    expect(result.resources.rear_bays).toEqual({ used: 4, limit: 4 });
  });

  it("не размещает ER220 13-й 3.5 диск в rear", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        form_factor: "2.5/3.5",
        capacity: 12,
      },
      {
        ...baseBays[0],
        id: "rear-bays",
        placement: "rear",
        form_factor: "2.5",
        capacity: 4,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "3.5",
        capacity_gb: 1000,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 13 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.front_bays).toEqual({ used: 12, limit: 12 });
    expect(result.resources.rear_bays).toEqual({ used: 0, limit: 4 });
    expect(codes(result.errors)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("rear_to_pcie зануляет rear bays и добавляет 2 PCIe slots для ER220HDR", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        capacity: 12,
      },
      {
        ...baseBays[0],
        id: "rear-bays",
        placement: "rear",
        capacity: 4,
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.gpu.id,
        component_type_key: "gpu",
        is_active: true,
      },
    ]);
    rows.set(CnfGpuProfileEntity, [
      {
        component_id: baseComponents.gpu.id,
        pcie_lanes: 16,
        rear_pcie_lanes: 8,
        physical_slots: 2,
        power_w: 300,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        options: { rear_to_pcie: true },
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
          { component_id: baseComponents.gpu.id, qty: 4 },
        ],
      }) as any,
    );

    expect(result.resources.rear_bays).toEqual({ used: 0, limit: 0 });
    expect(result.resources.pcie_slots).toEqual({ used: 8, limit: 8 });
    expect(result.normalized_configuration.options.rear_to_pcie).toBe(true);
    expect(codes(result.errors)).not.toContain("PCIE_SLOTS_EXCEEDED");
  });

  it("rear_to_pcie не удаляет выбранные rear-диски молча и оставляет конфигурацию невалидной", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        direct_sata_limit: 20,
      },
    ]);
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        capacity: 12,
      },
      {
        ...baseBays[0],
        id: "rear-bays",
        placement: "rear",
        capacity: 4,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(
      baseDto({
        options: { rear_to_pcie: true },
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 13 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.normalized_configuration.items).toEqual(
      expect.arrayContaining([
        { component_id: baseComponents.drive.id, qty: 13, source: "manual" },
      ]),
    );
    expect(result.resources.front_bays).toEqual({ used: 12, limit: 12 });
    expect(result.resources.rear_bays).toEqual({ used: 0, limit: 0 });
    expect(codes(result.errors)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("rear_to_pcie запрещен для Pluton и TSGM240", async () => {
    const plutonRows = baseRows();
    plutonRows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER225HTR-M8",
        family: "ER225HTR",
        pcie_slots: 0,
      },
    ]);
    const { service: plutonService } = makeService({ rows: plutonRows });

    const plutonResult = await plutonService.validateConfiguration(
      baseDto({ options: { rear_to_pcie: true } }) as any,
    );

    const tsgmRows = baseRows();
    tsgmRows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "TSGM240-M8",
        family: "TSGM240",
      },
    ]);
    const { service: tsgmService } = makeService({
      server: { ...baseServer, name: "TSGM240-M8" },
      rows: tsgmRows,
    });

    const tsgmResult = await tsgmService.validateConfiguration(
      baseDto({ options: { rear_to_pcie: true } }) as any,
    );

    expect(codes(plutonResult.errors)).toContain("REAR_TO_PCIE_UNAVAILABLE");
    expect(plutonResult.normalized_configuration.options.rear_to_pcie).toBe(false);
    expect(codes(tsgmResult.errors)).toContain("REAR_TO_PCIE_UNAVAILABLE");
    expect(tsgmResult.normalized_configuration.options.rear_to_pcie).toBe(false);
  });

  it("валидирует Pluton: разрешает 2 SATA 2.5 и 2 M.2", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER225HTR-M8",
        family: "ER225HTR",
        mode: "ocp_only",
        pcie_slots: 0,
        rear_pcie_ocp_limit: 0,
        ocp_slots: 8,
        direct_sata_limit: 2,
        internal_m2_bays: 2,
        is_active: true,
      },
    ]);
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        placement: "front",
        form_factor: "2.5",
        capacity: 2,
        allowed_drive_types: ["SATA"],
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.sataDrive.id,
        component_type_key: "drive",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
      {
        component_id: baseComponents.sataDrive.id,
        drive_type: "M2",
        interface_type: "NVME",
        m2_interface: "NVME",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 2 },
          { component_id: baseComponents.sataDrive.id, qty: 2 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(result.resources.front_bays).toEqual({ used: 2, limit: 2 });
    expect(result.resources.internal_m2).toEqual({ used: 2, limit: 2 });
    expect(codes(result.errors)).not.toContain("PLATFORM_DISABLED");
    expect(codes(result.errors)).not.toContain("PLUTON_STORAGE_FORBIDDEN");
    expect(codes(result.errors)).not.toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });

  it("возвращает PLUTON_NO_PCIE для GPU на Pluton", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER225HTR-M8",
        family: "ER225HTR",
        mode: "ocp_only",
        pcie_slots: 0,
        rear_pcie_ocp_limit: 0,
        ocp_slots: 8,
        is_active: true,
      },
    ]);
    rows.set(CnfPlatformForbiddenComponentTypeEntity, [
      {
        platform_profile_id: basePlatformProfile.id,
        component_type_key: "gpu",
        reason: "Плутон поддерживает только OCP-расширение",
      },
    ]);
    rows.set(CnfComponentCatalogProfileEntity, [
      ...(rows.get(CnfComponentCatalogProfileEntity) || []),
      {
        component_id: baseComponents.gpu.id,
        component_type_key: "gpu",
        is_active: true,
      },
    ]);
    const { service } = makeService({
      rows,
      components: [...Object.values(baseComponents)],
    });

    const result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 1 },
          { component_id: baseComponents.gpu.id, qty: 1 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(result.errors)).toContain("PLUTON_NO_PCIE");
  });

  it("возвращает PLUTON_STORAGE_FORBIDDEN для U.2 NVMe на Pluton", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER225HTR-M8",
        family: "ER225HTR",
        mode: "ocp_only",
        is_active: true,
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "NVME",
        interface_type: "NVME",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 4,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).toContain("PLUTON_STORAGE_FORBIDDEN");
  });

  it("ограничивает Pluton двумя SATA и двумя M.2", async () => {
    const rows = baseRows();
    rows.set(CnfPlatformProfileEntity, [
      {
        ...basePlatformProfile,
        platform_code: "ER225HTR-M8",
        family: "ER225HTR",
        mode: "ocp_only",
        direct_sata_limit: 2,
        internal_m2_bays: 2,
        is_active: true,
      },
    ]);
    rows.set(CnfPlatformBayEntity, [
      {
        ...baseBays[0],
        placement: "front",
        form_factor: "2.5",
        capacity: 2,
        allowed_drive_types: ["SATA"],
      },
    ]);
    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "SATA",
        interface_type: "SATA",
        form_factor: "2.5",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);
    const { service } = makeService({ rows });

    const sataResult = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 3 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    rows.set(CnfDriveProfileEntity, [
      {
        component_id: baseComponents.drive.id,
        drive_type: "M2",
        interface_type: "NVME",
        m2_interface: "NVME",
        form_factor: "M.2",
        capacity_gb: 960,
        pcie_lanes: 0,
        power_w: 12,
      },
    ]);

    const m2Result = await service.validateConfiguration(
      baseDto({
        items: [
          { component_id: baseComponents.cpu.id, qty: 1 },
          { component_id: baseComponents.ram.id, qty: 4 },
          { component_id: baseComponents.drive.id, qty: 3 },
          { component_id: baseComponents.psu.id, qty: 2 },
        ],
      }) as any,
    );

    expect(codes(sataResult.errors)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
    expect(codes(m2Result.errors)).not.toContain("DRIVE_BAY_LIMIT_EXCEEDED");
    expect(codes(m2Result.warnings)).toContain("DRIVE_BAY_LIMIT_EXCEEDED");
  });
});
