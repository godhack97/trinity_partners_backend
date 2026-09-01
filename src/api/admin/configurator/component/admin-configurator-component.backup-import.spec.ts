import {
  CnfComponentBackup,
  CnfComponentBackupData,
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
  CnfMultislotEntity,
  CnfMultislotSlotEntity,
  CnfNetworkProfileEntity,
  CnfProcessorGeneration,
  CnfPsuProfileEntity,
  CnfRamProfileEntity,
  CnfServerGeneration,
  CnfServiceProfileEntity,
  CnfSlotEntity,
  CnfTransceiverProfileEntity,
} from "@orm/entities";
import { CONFIGURATOR_COMPONENT_SCHEMA_VERSION } from "./configurator-component-schema";
import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";

type Store = Record<string, any[]>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const matches = (row: any, where: Record<string, any> = {}) =>
  Object.entries(where).every(([key, value]) => row?.[key] === value);

const collectionByEntity = new Map<any, string>([
  [CnfComponentEntity, "components"],
  [CnfComponentTypeEntity, "types"],
  [CnfComponentSlotEntity, "componentSlots"],
  [CnfSlotEntity, "slotDefinitions"],
  [CnfMultislotEntity, "multislots"],
  [CnfMultislotSlotEntity, "multislotSlots"],
  [CnfServerGeneration, "serverGenerations"],
  [CnfProcessorGeneration, "processorGenerations"],
  [CnfComponentBackup, "backups"],
  [CnfComponentBackupData, "backupData"],
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

const initialStore = (): Store => ({
  components: [{
    id: "gpu-1",
    type_id: "gpu-type-id",
    subtype: "",
    name: "GPU 48 GB",
    description: "GPU для вычислений",
    price: 1000,
    server_generation_id: null,
    processor_generation_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }],
  types: [
    { id: "gpu-type-id", name: "GPU" },
    { id: "memory-type-id", name: "Drive" },
  ],
  componentSlots: [{
    id: 1,
    component_id: "gpu-1",
    slot_id: "pcie-slot",
    amount: 1,
    increase: false,
  }],
  slotDefinitions: [{ id: "pcie-slot", name: "PCIe x16" }],
  multislots: [{ id: "rear-riser", name: "Rear riser" }],
  multislotSlots: [{
    id: "rear-riser-pcie",
    multislot_id: "rear-riser",
    slot_id: "pcie-slot",
  }],
  serverGenerations: [],
  processorGenerations: [],
  backups: [],
  backupData: [],
  catalog: [{
    id: "catalog-1",
    component_id: "gpu-1",
    component_type_key: "gpu",
    is_active: true,
  }],
  resource: [{
    id: "resource-1",
    component_id: "gpu-1",
    resource_kind: "gpu",
    pcie_lanes: 16,
  }],
  price: [{
    id: "price-1",
    component_id: "gpu-1",
    base_price: 1000,
  }],
  cpu: [],
  ram: [],
  drive: [],
  controller: [],
  network: [],
  gpu: [{
    id: "gpu-profile-1",
    component_id: "gpu-1",
    pcie_lanes: 16,
    rear_pcie_lanes: 16,
    physical_slots: 1,
    memory_gb: 48,
    power_w: 350,
  }],
  transceiver: [],
  psu: [],
  service: [],
});

const createMemory = () => {
  let committed = initialStore();
  let sequence = 0;
  let failEntity: any = null;

  const createRepository = (entity: any, getStore: () => Store) => {
    const collectionName = collectionByEntity.get(entity);
    if (!collectionName) throw new Error(`Unknown repository ${entity?.name}`);
    const rows = () => getStore()[collectionName];
    const withRelations = (row: any) => {
      if (!row) return null;
      if (entity !== CnfComponentEntity) return clone(row);
      return {
        ...clone(row),
        slots: getStore().componentSlots
          .filter((slot) => slot.component_id === row.id)
          .map((slot) => ({
            ...clone(slot),
            slot: clone(
              getStore().slotDefinitions.find(
                (definition) => definition.id === slot.slot_id,
              ),
            ),
          })),
      };
    };
    const saveOne = (input: any) => {
      if (entity === failEntity) throw new Error("forced profile failure");
      const value = clone(input);
      if (entity === CnfComponentBackup) {
        value.id ||= `backup-${++sequence}`;
        value.created_at ||= new Date().toISOString();
      } else if (entity !== CnfComponentBackupData) {
        value.id ||= `${collectionName}-${++sequence}`;
      }
      const identity = entity === CnfComponentBackupData
        ? "backup_id"
        : "id";
      const index = rows().findIndex(
        (row) => row[identity] === value[identity],
      );
      if (index >= 0) rows()[index] = value;
      else rows().push(value);
      return clone(value);
    };

    return {
      create: jest.fn((input) => clone(input)),
      merge: jest.fn((target, patch) => ({ ...clone(target), ...clone(patch) })),
      find: jest.fn(async (options: any = {}) => {
        let result = rows();
        if (options.where) {
          result = result.filter((row) => matches(row, options.where));
        }
        if (options.order?.created_at === "DESC") {
          result = [...result].sort((a, b) =>
            `${b.created_at}`.localeCompare(`${a.created_at}`),
          );
        }
        return result.map(withRelations);
      }),
      findOne: jest.fn(async ({ where }) =>
        withRelations(rows().find((row) => matches(row, where))),
      ),
      findOneBy: jest.fn(async (where) =>
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
    repository: (entity: any) =>
      createRepository(entity, () => committed),
    state: () => clone(committed),
    mutate: (callback: (store: Store) => void) => callback(committed),
    failNextSaveOf: (entity: any) => {
      failEntity = entity;
    },
  };
};

const makeService = (memory: ReturnType<typeof createMemory>) =>
  new AdminConfiguratorComponentService(
    memory.repository(CnfComponentEntity) as any,
    memory.repository(CnfComponentTypeEntity) as any,
    memory.repository(CnfSlotEntity) as any,
    memory.repository(CnfProcessorGeneration) as any,
    memory.repository(CnfServerGeneration) as any,
    memory.repository(CnfComponentBackup) as any,
    memory.repository(CnfComponentBackupData) as any,
    memory.dataSource,
  );

const importRow = (overrides: Record<string, any> = {}) => ({
  ID: "gpu-1",
  "Название": "GPU 80 GB",
  "Описание": "GPU для вычислений",
  "Подтип": "Не указано",
  "Цена": 1200,
  "Тип компонента": "gpu-type-id",
  "Слот[1]": "PCIe x16",
  "Количество[1]": 1,
  "Увеличение[1]": "Нет",
  "profile.catalog.component_type_key": "gpu",
  "profile.resource.resource_kind": "gpu",
  "profile.price.base_price": 1200,
  "profile.gpu.memory_gb": 80,
  ...overrides,
});

describe("AdminConfiguratorComponentService backup/restore/import", () => {
  it("creates a versioned snapshot with slots, references and every profile", async () => {
    const memory = createMemory();
    const service = makeService(memory);

    const backup = await service.createBackup("Before changes", "admin-1");
    const snapshot = memory.state().backupData[0].component_data;

    expect(backup.schema_version).toBe(CONFIGURATOR_COMPONENT_SCHEMA_VERSION);
    expect(snapshot.references.multislots).toEqual([
      { id: "rear-riser", name: "Rear riser" },
    ]);
    expect(snapshot.references.multislot_slots).toEqual([{
      id: "rear-riser-pcie",
      multislot_id: "rear-riser",
      slot_id: "pcie-slot",
    }]);
    expect(snapshot.components[0].slots).toEqual([
      expect.objectContaining({ slot_id: "pcie-slot" }),
    ]);
    expect(snapshot.components[0].profiles.gpu).toEqual(
      expect.objectContaining({ memory_gb: 48 }),
    );
    expect(snapshot.components[0].component.description).toBe("GPU для вычислений");
    expect(Object.keys(snapshot.components[0].profiles)).toHaveLength(12);
  });

  it("restores the exact component, slots and profiles from a v2 snapshot", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    const before = await service.getComponentProfiles("gpu-1");
    const backup = await service.createBackup("Original");
    memory.mutate((store) => {
      store.components[0].name = "Changed";
      store.componentSlots = [];
      store.gpu[0].memory_gb = 80;
    });

    const result = await service.restoreFromBackup(backup.id);
    const restored = await service.getComponentProfiles("gpu-1");

    expect(result).toEqual(expect.objectContaining({
      components_count: 1,
      slots_count: 1,
      profiles_count: 4,
    }));
    expect(restored.component.name).toBe("GPU 48 GB");
    expect(restored.component.slots).toHaveLength(1);
    expect(restored.gpu.memory_gb).toBe(48);
    expect(restored).toEqual(before);
  });

  it("rejects a legacy backup version without touching current data", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    const backup = await service.createBackup("Legacy");
    memory.mutate((store) => {
      store.components[0].name = "Current version";
      store.backupData[0].component_data.schema_version = 1;
    });

    await expect(service.restoreFromBackup(backup.id)).rejects.toThrow(
      "Версия бекапа 1 несовместима",
    );
    expect(memory.state().components[0].name).toBe("Current version");
  });

  it("validates references before deletion and preserves current data", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    const backup = await service.createBackup("Broken reference");
    memory.mutate((store) => {
      store.components[0].name = "Must stay";
      store.backupData[0].component_data.components[0].slots[0].slot_id =
        "missing-slot";
    });

    await expect(service.restoreFromBackup(backup.id)).rejects.toThrow(
      "отсутствует в текущем справочнике",
    );
    expect(memory.state().components[0].name).toBe("Must stay");
    expect(memory.state().gpu[0].memory_gb).toBe(48);
  });

  it("rolls back a restore when a profile save fails", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    const backup = await service.createBackup("Rollback");
    memory.mutate((store) => {
      store.components[0].name = "Current version";
      store.gpu[0].memory_gb = 96;
    });
    memory.failNextSaveOf(CnfGpuProfileEntity);

    await expect(service.restoreFromBackup(backup.id)).rejects.toThrow(
      "forced profile failure",
    );
    expect(memory.state().components[0].name).toBe("Current version");
    expect(memory.state().gpu[0].memory_gb).toBe(96);
  });

  it("dry-runs without writes and successful import creates exactly one backup", async () => {
    const memory = createMemory();
    const service = makeService(memory);

    const dryRun = await service.importExcel([importRow()], "admin-1", {
      dryRun: true,
      schemaVersion: CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
    });
    expect(dryRun).toEqual(expect.objectContaining({
      dry_run: true,
      updated: 1,
      added: 0,
      deleted: 0,
      errors: [],
    }));
    expect(memory.state().backups).toHaveLength(0);
    expect(memory.state().gpu[0].memory_gb).toBe(48);

    const imported = await service.importExcel([importRow()], "admin-1", {
      schemaVersion: CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
    });
    expect(imported.backup_id).toBeTruthy();
    expect(memory.state().backups).toHaveLength(1);
    expect(memory.state().gpu[0].memory_gb).toBe(80);
    expect(memory.state().components[0].name).toBe("GPU 80 GB");
  });

  it("returns validation errors from dry-run without creating a backup", async () => {
    const memory = createMemory();
    const service = makeService(memory);

    const report = await service.importExcel([
      importRow({
        "Тип компонента": "missing-type",
        "Количество[1]": 0,
      }),
    ], "admin-1", { dryRun: true });

    expect(report.valid_rows).toBe(0);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("Тип компонента"),
    ]));
    expect(memory.state().backups).toHaveLength(0);
  });

  it("reports an identical existing row as unchanged", async () => {
    const memory = createMemory();
    const service = makeService(memory);

    const report = await service.importExcel([
      importRow({
        "Название": "GPU 48 GB",
        "Цена": 1000,
        "profile.price.base_price": 1000,
        "profile.gpu.memory_gb": 48,
      }),
    ], "admin-1", { dryRun: true });

    expect(report).toEqual(expect.objectContaining({
      added: 0,
      updated: 0,
      unchanged: 1,
      deleted: 0,
      updated_ids: [],
      errors: [],
    }));
    expect(memory.state().backups).toHaveLength(0);
  });

  it("preserves an existing description when importing a legacy XLSX row", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    const row = importRow({
      "Название": "GPU 48 GB",
      "Цена": 1000,
      "profile.price.base_price": 1000,
      "profile.gpu.memory_gb": 48,
    });
    delete row["Описание"];

    const report = await service.importExcel([row], "admin-1", {
      dryRun: true,
    });

    expect(report).toEqual(expect.objectContaining({
      updated: 0,
      unchanged: 1,
      errors: [],
    }));
    expect(memory.state().components[0].description).toBe("GPU для вычислений");
  });

  it("keeps the complete component aggregate unchanged after export and import", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    const before = await service.getComponentProfiles("gpu-1");
    const exportedRows = await service.exportExcel();

    const report = await service.importExcel(exportedRows, "admin-1", {
      schemaVersion: CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
    });
    const after = await service.getComponentProfiles("gpu-1");

    expect(exportedRows[0]).toEqual(expect.objectContaining({
      "Описание": "GPU для вычислений",
      "profile.gpu.memory_gb": 48,
      "profile.resource.pcie_lanes": 16,
      "Слот[1]": "PCIe x16",
    }));
    expect(report).toEqual(expect.objectContaining({
      added: 0,
      updated: 0,
      unchanged: 1,
      errors: [],
    }));
    expect(memory.state().backups).toHaveLength(1);
    expect(after).toEqual(before);
  });

  it("dry-runs and executes an explicit delete row inside the backed-up transaction", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    const before = await service.getComponentProfiles("gpu-1");
    const deleteRow = { ID: "gpu-1", "Действие": "delete" };

    const dryRun = await service.importExcel([deleteRow], "admin-1", {
      dryRun: true,
      schemaVersion: CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
    });
    expect(dryRun).toEqual(expect.objectContaining({
      deleted: 1,
      deleted_ids: ["gpu-1"],
      errors: [],
    }));
    expect(memory.state().components).toHaveLength(1);
    expect(memory.state().backups).toHaveLength(0);

    const imported = await service.importExcel([deleteRow], "admin-1", {
      schemaVersion: CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
    });
    expect(imported.deleted).toBe(1);
    expect(memory.state().components).toHaveLength(0);
    expect(memory.state().componentSlots).toHaveLength(0);
    expect(memory.state().gpu).toHaveLength(0);
    expect(memory.state().backups).toHaveLength(1);

    await service.restoreFromBackup(imported.backup_id!);
    expect(await service.getComponentProfiles("gpu-1")).toEqual(before);
  });

  it("rolls back import data and its auto-backup on a persistence error", async () => {
    const memory = createMemory();
    const service = makeService(memory);
    memory.failNextSaveOf(CnfGpuProfileEntity);

    await expect(service.importExcel([importRow()], "admin-1", {
      schemaVersion: CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
    })).rejects.toThrow("forced profile failure");

    expect(memory.state().backups).toHaveLength(0);
    expect(memory.state().backupData).toHaveLength(0);
    expect(memory.state().components[0].name).toBe("GPU 48 GB");
    expect(memory.state().gpu[0].memory_gb).toBe(48);
  });
});
