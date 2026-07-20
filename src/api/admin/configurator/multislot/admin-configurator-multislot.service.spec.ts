import {
  CnfMultislotEntity,
  CnfMultislotSlotEntity,
  CnfServerMultislotEntity,
  CnfSlotEntity,
} from "@orm/entities";
import { AdminConfiguratorMultislotService } from "./admin-configurator-multislot.service";

const slot1 = "11111111-1111-4111-8111-111111111111";
const slot2 = "22222222-2222-4222-8222-222222222222";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const makeMemory = () => {
  let committed: any = {
    multislots: [{ id: "multislot-1", name: "Old name" }],
    multislotSlots: [{
      id: "relation-old",
      multislot_id: "multislot-1",
      slot_id: slot1,
    }],
    slots: [{ id: slot1, name: "PCIe" }, { id: slot2, name: "OCP" }],
    serverMultislots: [],
  };
  let failRelationSave = false;

  const collection = (entity: any) => {
    if (entity === CnfMultislotEntity) return "multislots";
    if (entity === CnfMultislotSlotEntity) return "multislotSlots";
    if (entity === CnfSlotEntity) return "slots";
    if (entity === CnfServerMultislotEntity) return "serverMultislots";
    throw new Error(`Unknown entity ${entity?.name}`);
  };
  const repository = (entity: any, store: any) => {
    const key = collection(entity);
    const rows = () => store[key];
    const saveOne = (input: any) => {
      if (entity === CnfMultislotSlotEntity && failRelationSave) {
        throw new Error("forced relation failure");
      }
      const value = clone(input);
      const index = rows().findIndex((row: any) => row.id === value.id);
      if (index >= 0) rows()[index] = value;
      else rows().push(value);
      return clone(value);
    };
    return {
      create: (input: any) => clone(input),
      merge: (target: any, patch: any) => ({ ...clone(target), ...clone(patch) }),
      find: async (options: any = {}) => {
        const where = options.where || {};
        return clone(rows().filter((row: any) =>
          Object.entries(where).every(([field, value]) => row[field] === value),
        ));
      },
      findOneBy: async (where: any) => clone(rows().find((row: any) =>
        Object.entries(where).every(([field, value]) => row[field] === value),
      ) || null),
      save: async (input: any) => Array.isArray(input)
        ? input.map(saveOne)
        : saveOne(input),
      delete: async (where: any) => {
        const before = rows().length;
        store[key] = rows().filter((row: any) =>
          !Object.entries(where).every(([field, value]) => row[field] === value),
        );
        return { affected: before - store[key].length };
      },
    };
  };
  const dataSource: any = {
    transaction: jest.fn(async (callback) => {
      const working = clone(committed);
      const manager = { getRepository: (entity: any) => repository(entity, working) };
      const result = await callback(manager);
      committed = working;
      return result;
    }),
  };

  return {
    dataSource,
    state: () => clone(committed),
    failRelations: () => { failRelationSave = true; },
  };
};

const makeService = (memory: ReturnType<typeof makeMemory>) =>
  new AdminConfiguratorMultislotService({} as any, memory.dataSource);

describe("AdminConfiguratorMultislotService", () => {
  it("creates and returns a multislot with the selected slots", async () => {
    const memory = makeMemory();
    const service = makeService(memory);

    const result = await service.createMultislot({
      name: "  Front riser  ",
      multislot_slots: [{ slot_id: slot1 }, { slot_id: slot2 }],
    });

    expect(result.name).toBe("Front riser");
    expect(result.multislot_slots.map((item: any) => item.slot_id)).toEqual([
      slot1,
      slot2,
    ]);
  });

  it("updates name and replaces the slot relations atomically", async () => {
    const memory = makeMemory();
    const service = makeService(memory);

    const result = await service.updateMultislot("multislot-1", {
      name: "Rear OCP",
      multislot_slots: [{ slot_id: slot2 }],
    });

    expect(result).toEqual(expect.objectContaining({
      id: "multislot-1",
      name: "Rear OCP",
    }));
    expect(result.multislot_slots).toEqual([
      expect.objectContaining({ slot_id: slot2 }),
    ]);
    expect(memory.state().multislotSlots).toHaveLength(1);
  });

  it("validates references before writes", async () => {
    const memory = makeMemory();
    const service = makeService(memory);

    await expect(service.updateMultislot("multislot-1", {
      name: "Must not change",
      multislot_slots: [{
        slot_id: "33333333-3333-4333-8333-333333333333",
      }],
    })).rejects.toThrow("Слоты не найдены");
    expect(memory.state().multislots[0].name).toBe("Old name");
    expect(memory.state().multislotSlots[0].slot_id).toBe(slot1);
  });

  it("rolls back name and relations when relation persistence fails", async () => {
    const memory = makeMemory();
    const service = makeService(memory);
    memory.failRelations();

    await expect(service.updateMultislot("multislot-1", {
      name: "Must roll back",
      multislot_slots: [{ slot_id: slot2 }],
    })).rejects.toThrow("forced relation failure");
    expect(memory.state().multislots[0].name).toBe("Old name");
    expect(memory.state().multislotSlots).toEqual([
      expect.objectContaining({ slot_id: slot1 }),
    ]);
  });

  it("deletes relation rows with an unused multislot", async () => {
    const memory = makeMemory();
    const service = makeService(memory);

    await expect(service.deleteMultislot("multislot-1")).resolves.toEqual({
      success: true,
    });
    expect(memory.state().multislots).toHaveLength(0);
    expect(memory.state().multislotSlots).toHaveLength(0);
  });
});
