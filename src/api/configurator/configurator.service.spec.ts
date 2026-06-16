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
  ocp: component("ocp-1", "ocp-type-id", "OCP NIC"),
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
  it("показывает итоговую цену, если выбраны платформа, CPU, RAM, диск и сервис", async () => {
    const { service } = makeService();

    const result = await service.validateConfiguration(baseDto() as any);

    expect(codes(result.errors)).not.toContain("REQUIRED_COMPONENT_MISSING");
    expect(result.price.is_visible).toBe(true);
    expect(result.price.service_total).toBe(1);
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
    expect(codes(result.errors)).toContain("CONTROLLER_PORTS_NOT_ENOUGH");
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
    expect(codes(result.errors)).toContain("CONTROLLER_PORTS_NOT_ENOUGH");
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
    expect(codes(result.errors)).not.toContain("CONTROLLER_PORTS_NOT_ENOUGH");
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
    expect(codes(result.errors)).toContain("DRIVE_BAYS_EXCEEDED");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DRIVE_BAYS_EXCEEDED",
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
    expect(codes(result.errors)).toContain("DRIVE_BAYS_EXCEEDED");
  });
});
