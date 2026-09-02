import {
  CnfPlatformBayEntity,
  CnfPlatformForbiddenComponentTypeEntity,
  CnfPlatformProfileEntity,
  CnfServerEntity,
  CnfServerGeneration,
  CnfServerMultislotEntity,
  CnfServerSlotEntity,
} from "@orm/entities";
import { AdminConfiguratorServerService } from "./admin-configurator-server.service";
import { SaveServerWithProfileRequestDto } from "./dto/request/add-server.request.dto";

type Store = Record<string, any[]>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const collectionByEntity = new Map<any, string>([
  [CnfServerEntity, "servers"],
  [CnfServerGeneration, "generations"],
  [CnfServerSlotEntity, "slots"],
  [CnfServerMultislotEntity, "multislots"],
  [CnfPlatformProfileEntity, "profiles"],
  [CnfPlatformBayEntity, "bays"],
  [CnfPlatformForbiddenComponentTypeEntity, "forbidden"],
]);

const matches = (row: any, where: Record<string, any> = {}) =>
  Object.entries(where).every(([key, value]) => row?.[key] === value);

const createInMemoryDataSource = () => {
  let committed: Store = {
    servers: [],
    generations: [{ id: "generation-1", name: "M8" }],
    slots: [],
    multislots: [],
    profiles: [],
    bays: [],
    forbidden: [],
  };
  let failProfileSave = false;
  let sequence = 0;

  const createRepository = (entity: any, getStore: () => Store) => {
    const collectionName = collectionByEntity.get(entity);
    if (!collectionName) throw new Error(`Unknown repository ${entity?.name}`);

    const rows = () => getStore()[collectionName];
    const withRelations = (row: any) => {
      if (!row) return null;
      if (entity !== CnfServerEntity) return clone(row);

      return {
        ...clone(row),
        slots: clone(getStore().slots.filter((slot) => slot.server_id === row.id)),
        multislots: clone(
          getStore().multislots.filter(
            (multislot) => multislot.server_id === row.id,
          ),
        ),
      };
    };
    const saveOne = (input: any) => {
      if (entity === CnfPlatformProfileEntity && failProfileSave) {
        throw new Error("profile save failed");
      }

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
      find: jest.fn(async ({ where }) =>
        clone(rows().filter((row) => matches(row, where))),
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
    getRepository: (entity: any) =>
      createRepository(entity, () => committed),
  };
  Object.defineProperty(dataSource, "manager", {
    get: () => createManager(() => committed),
  });

  return {
    dataSource,
    getState: () => clone(committed),
    failNextProfileSave: () => {
      failProfileSave = true;
    },
  };
};

const payload = (): SaveServerWithProfileRequestDto => ({
  name: "ER220",
  description: "Server platform",
  serverbox_height_id: "height-1",
  server_generation_id: "generation-1",
  price: 1000,
  image: "/public/server/front.webp",
  images: [
    "/public/server/front.webp",
    "/public/server/rear.webp",
  ],
  sort: 10,
  slots: [
    { slot_id: "slot-front", amount: 2, on_back_panel: false },
  ],
  multislots: [
    { multislot_id: "multislot-rear", amount: 1, on_back_panel: true },
  ],
  profile: {
    platform_code: "ER220-M8",
    family: "ER220",
    gpu_limit: 4,
    ram_type: "DDR5",
    is_active: true,
    bays: [
      {
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 8,
        allowed_drive_types: ["SAS", "NVME"],
      },
    ],
    forbidden_component_types: [
      { component_type_key: "gpu", reason: "No GPU" },
    ],
  },
});

describe("AdminConfiguratorServerService atomic server/profile save", () => {
  it("creates and reads the complete server, profile and panel placement", async () => {
    const memory = createInMemoryDataSource();
    const service = new AdminConfiguratorServerService(memory.dataSource);

    const result = await service.addServer(payload());

    expect(memory.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(result.server.name).toBe("ER220");
    expect(result.server.image).toBe("/public/server/front.webp");
    expect(result.server.images).toEqual([
      "/public/server/front.webp",
      "/public/server/rear.webp",
    ]);
    expect(result.server.slots).toEqual([
      expect.objectContaining({
        slot_id: "slot-front",
        on_back_panel: false,
      }),
    ]);
    expect(result.server.multislots).toEqual([
      expect.objectContaining({
        multislot_id: "multislot-rear",
        on_back_panel: true,
      }),
    ]);
    expect(result.profile).toEqual(
      expect.objectContaining({
        platform_code: "ER220-M8",
        gpu_limit: 4,
        is_active: true,
      }),
    );
    expect(result.bays).toHaveLength(1);
    expect(result.forbidden_component_types).toHaveLength(1);
  });

  it("keeps legacy image clients compatible and removes duplicate images", async () => {
    const memory = createInMemoryDataSource();
    const service = new AdminConfiguratorServerService(memory.dataSource);
    const legacyPayload = payload();
    legacyPayload.images = undefined;

    const legacy = await service.addServer(legacyPayload);
    expect(legacy.server.images).toEqual(["/public/server/front.webp"]);
    expect(legacy.server.image).toBe("/public/server/front.webp");

    const update = payload();
    update.images = [
      "/public/server/rear.webp",
      "/public/server/rear.webp",
      "/public/server/front.webp",
    ];
    const updated = await service.updateServer(legacy.server.id, update);
    expect(updated.server.images).toEqual([
      "/public/server/rear.webp",
      "/public/server/front.webp",
    ]);
    expect(updated.server.image).toBe("/public/server/rear.webp");
  });

  it("atomically replaces server fields, slots and profile and returns round-trip data", async () => {
    const memory = createInMemoryDataSource();
    const service = new AdminConfiguratorServerService(memory.dataSource);
    const created = await service.addServer(payload());
    const update = payload();
    update.name = "ER220 updated";
    update.slots = [
      { slot_id: "slot-rear", amount: 4, on_back_panel: true },
    ];
    update.multislots = [];
    update.profile.is_active = false;
    update.profile.platform_code = "ER220-M8-UPDATED";

    const result = await service.updateServer(created.server.id, update);
    const reread = await service.getPlatformProfile(created.server.id);

    expect(result.server.name).toBe("ER220 updated");
    expect(result.server.slots).toEqual([
      expect.objectContaining({ slot_id: "slot-rear", on_back_panel: true }),
    ]);
    expect(result.server.multislots).toEqual([]);
    expect(result.profile.is_active).toBe(false);
    expect(reread).toEqual(result);
  });

  it("rolls back the server and slot update when profile persistence fails", async () => {
    const memory = createInMemoryDataSource();
    const service = new AdminConfiguratorServerService(memory.dataSource);
    const created = await service.addServer(payload());
    const update = payload();
    update.name = "must be rolled back";
    update.slots = [
      { slot_id: "broken-slot", amount: 1, on_back_panel: true },
    ];
    memory.failNextProfileSave();

    await expect(
      service.updateServer(created.server.id, update),
    ).rejects.toThrow("profile save failed");

    const reread = await service.getPlatformProfile(created.server.id);
    expect(reread.server.name).toBe("ER220");
    expect(reread.server.slots).toEqual([
      expect.objectContaining({ slot_id: "slot-front" }),
    ]);
    expect(memory.getState().slots).toHaveLength(1);
  });
});
