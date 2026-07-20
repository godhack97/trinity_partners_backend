import {
  CnfComponentCatalogProfileEntity,
  CnfComponentEntity,
  CnfComponentPriceProfileEntity,
  CnfComponentResourceProfileEntity,
  CnfComponentSlotEntity,
  CnfComponentTypeEntity,
  CnfControllerProfileEntity,
  CnfCpuProfileEntity,
  CnfDriveProfileEntity,
  CnfGpuProfileEntity,
  CnfNetworkProfileEntity,
  CnfPsuProfileEntity,
  CnfRamProfileEntity,
  CnfServiceProfileEntity,
  CnfTransceiverProfileEntity,
} from "@orm/entities";
import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";
import { SaveConfigurationComponentRequestDto } from "./dto/request/create-configurator-component.request.dto";

type Store = Record<string, any[]>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const collectionByEntity = new Map<any, string>([
  [CnfComponentEntity, "components"],
  [CnfComponentTypeEntity, "types"],
  [CnfComponentSlotEntity, "slots"],
  [CnfComponentCatalogProfileEntity, "catalog"],
  [CnfComponentResourceProfileEntity, "resource"],
  [CnfComponentPriceProfileEntity, "price"],
  [CnfCpuProfileEntity, "cpu"],
  [CnfRamProfileEntity, "ram"],
  [CnfDriveProfileEntity, "drive"],
  [CnfControllerProfileEntity, "controller"],
  [CnfNetworkProfileEntity, "network"],
  [CnfGpuProfileEntity, "gpu"],
  [CnfTransceiverProfileEntity, "transceiver"],
  [CnfPsuProfileEntity, "psu"],
  [CnfServiceProfileEntity, "service"],
]);

const matches = (row: any, where: Record<string, any> = {}) =>
  Object.entries(where).every(([key, value]) => row?.[key] === value);

const createInMemoryDataSource = () => {
  let committed: Store = {
    components: [],
    types: [
      { id: "gpu-type-id", name: "GPU" },
      { id: "memory-type-id", name: "Drive" },
    ],
    slots: [],
    catalog: [],
    resource: [],
    price: [],
    cpu: [],
    ram: [],
    drive: [],
    controller: [],
    network: [],
    gpu: [],
    transceiver: [],
    psu: [],
    service: [],
  };
  let failEntity: any = null;
  let sequence = 0;

  const createRepository = (entity: any, getStore: () => Store) => {
    const collectionName = collectionByEntity.get(entity);
    if (!collectionName) throw new Error(`Unknown repository ${entity?.name}`);

    const rows = () => getStore()[collectionName];
    const withRelations = (row: any) => {
      if (!row) return null;
      if (entity !== CnfComponentEntity) return clone(row);

      return {
        ...clone(row),
        slots: clone(
          getStore().slots.filter((slot) => slot.component_id === row.id),
        ),
      };
    };
    const saveOne = (input: any) => {
      if (entity === failEntity) throw new Error("profile save failed");

      const value = clone(input);
      value.id ||= `${collectionName}-${++sequence}`;
      const index = rows().findIndex((row) => row.id === value.id);
      if (index >= 0) rows()[index] = value;
      else rows().push(value);
      return clone(value);
    };

    return {
      create: jest.fn((input) => clone(input)),
      merge: jest.fn((target, patch) => ({ ...clone(target), ...clone(patch) })),
      findOneBy: jest.fn(async (where) =>
        withRelations(rows().find((row) => matches(row, where))),
      ),
      findOne: jest.fn(async ({ where }) =>
        withRelations(rows().find((row) => matches(row, where))),
      ),
      save: jest.fn(async (input) =>
        Array.isArray(input) ? input.map(saveOne) : saveOne(input),
      ),
      delete: jest.fn(async (criteria) => {
        const where = typeof criteria === "object" ? criteria : { id: criteria };
        const retained = rows().filter((row) => !matches(row, where));
        const affected = rows().length - retained.length;
        getStore()[collectionName] = retained;
        return { affected };
      }),
    };
  };

  const createManager = (getStore: () => Store) => ({
    getRepository: (entity: any) => createRepository(entity, getStore),
  });
  const dataSource: any = {
    transaction: jest.fn(async (callback) => {
      const working = clone(committed);
      const result = await callback(createManager(() => working));
      committed = working;
      return result;
    }),
  };
  Object.defineProperty(dataSource, "manager", {
    get: () => createManager(() => committed),
  });

  return {
    dataSource,
    getState: () => clone(committed),
    failNextSaveOf: (entity: any) => {
      failEntity = entity;
    },
  };
};

const makeService = (dataSource: any) => new AdminConfiguratorComponentService(
  {} as any,
  {} as any,
  {} as any,
  {} as any,
  {} as any,
  {} as any,
  {} as any,
  dataSource,
);

const gpuPayload = (): SaveConfigurationComponentRequestDto => ({
  name: "GPU 48 GB",
  price: 1000,
  type_id: "gpu-type-id",
  subtype: null,
  slots: [{ slot_id: "pcie-slot", amount: 1, increase: false }],
  server_generation_id: null,
  processor_generation_id: null,
  profiles: {
    catalog: { component_type_key: "gpu", is_active: true },
    resource: { resource_kind: "gpu", pcie_lanes: 16 },
    price: { base_price: 1000 },
    gpu: {
      pcie_lanes: 16,
      rear_pcie_lanes: 16,
      physical_slots: 1,
      memory_gb: 48,
      power_w: 350,
    },
  },
});

const drivePayload = (): SaveConfigurationComponentRequestDto => ({
  name: "U.2 NVMe 1.92 TB",
  price: 800,
  type_id: "memory-type-id",
  subtype: "U.2",
  slots: [{ slot_id: "u2-slot", amount: 1, increase: false }],
  server_generation_id: null,
  processor_generation_id: null,
  profiles: {
    catalog: { component_type_key: "legacy-wrong-value", is_active: true },
    resource: { resource_kind: "legacy-wrong-value", pcie_lanes: 4 },
    price: { base_price: 800 },
    drive: {
      drive_type: "NVME",
      interface_type: "NVME",
      media_kind: "NVME",
      form_factor: "2.5",
      capacity_gb: 1920,
      pcie_lanes: 4,
    },
  },
});

describe("AdminConfiguratorComponentService atomic component/profile save", () => {
  it("creates and returns the complete base component and current profile fields", async () => {
    const memory = createInMemoryDataSource();
    const service = makeService(memory.dataSource);

    const result = await service.createComponent(gpuPayload());

    expect(memory.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(result.component.slots).toEqual([
      expect.objectContaining({ slot_id: "pcie-slot", increase: false }),
    ]);
    expect(result.gpu).toEqual(expect.objectContaining({ memory_gb: 48 }));
    expect(result.component_type_key).toBe("gpu");
    expect(result.profile_kind).toBe("gpu");
    expect(result.profile_errors).toEqual([]);
  });

  it("atomically changes kind, replaces slots and removes incompatible profiles", async () => {
    const memory = createInMemoryDataSource();
    const service = makeService(memory.dataSource);
    const created = await service.createComponent(gpuPayload());

    const result = await service.updateComponent(
      created.component.id,
      drivePayload(),
    );

    expect(result.component.name).toBe("U.2 NVMe 1.92 TB");
    expect(result.component.slots).toEqual([
      expect.objectContaining({ slot_id: "u2-slot" }),
    ]);
    expect(result.gpu).toBeNull();
    expect(result.drive).toEqual(expect.objectContaining({
      media_kind: "NVME",
      capacity_gb: 1920,
    }));
    expect(result.catalog.component_type_key).toBe("drive");
    expect(result.resource.resource_kind).toBe("drive");
    expect(memory.getState().gpu).toHaveLength(0);
  });

  it("distinguishes nullable field clearing from explicit profile deletion", async () => {
    const memory = createInMemoryDataSource();
    const service = makeService(memory.dataSource);
    const created = await service.createComponent(gpuPayload());
    const update = gpuPayload();
    update.profiles.gpu = {
      ...update.profiles.gpu,
      memory_gb: null,
    };

    const cleared = await service.updateComponent(created.component.id, update);
    expect(cleared.gpu).toEqual(expect.objectContaining({ memory_gb: null }));

    const deleted = await service.upsertComponentProfiles(
      created.component.id,
      { gpu: null },
    );
    expect(deleted.gpu).toBeNull();
  });

  it("rolls back component, slots and profiles when profile persistence fails", async () => {
    const memory = createInMemoryDataSource();
    const service = makeService(memory.dataSource);
    const created = await service.createComponent(gpuPayload());
    memory.failNextSaveOf(CnfDriveProfileEntity);

    await expect(service.updateComponent(
      created.component.id,
      drivePayload(),
    )).rejects.toThrow("profile save failed");

    const reread = await service.getComponentProfiles(created.component.id);
    expect(reread.component.name).toBe("GPU 48 GB");
    expect(reread.component.slots).toEqual([
      expect.objectContaining({ slot_id: "pcie-slot" }),
    ]);
    expect(reread.gpu).toEqual(expect.objectContaining({ memory_gb: 48 }));
    expect(reread.drive).toBeNull();
  });
});
