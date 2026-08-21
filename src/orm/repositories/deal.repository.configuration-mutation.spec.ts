import { DealStatus } from "@orm/entities";
import { DealRepository } from "./deal.repository";

const makeRepository = (lockedDeal: Record<string, unknown> | null) => {
  const update = jest.fn().mockResolvedValue({ affected: 1 });
  const query = jest.fn().mockResolvedValue(lockedDeal ? [lockedDeal] : []);
  const getRepository = jest.fn().mockReturnValue({ update });
  const manager = {
    transaction: jest.fn(async (work) => work({ query, getRepository })),
  };
  const repository = { manager } as unknown as DealRepository;
  Object.setPrototypeOf(repository, DealRepository.prototype);
  return { repository, manager, query, update };
};

describe("DealRepository configuration mutations", () => {
  it("does not restore draft when submit changed the locked row to moderation", async () => {
    const { repository, manager, query, update } = makeRepository({
      id: 7,
      status: DealStatus.Moderation,
      creator_id: 31,
      configurations: [{ id: "old" }],
    });

    await expect(
      repository.mutateDealConfigurations(7, DealStatus.Draft, {
        kind: "creator",
        userId: 31,
      }, {
        type: "append",
        configurations: [{ id: "new" }],
      }),
    ).resolves.toBe("stale");

    expect(manager.transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("FOR UPDATE"),
      [7],
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("appends to the authoritative collection read after acquiring the row lock", async () => {
    const { repository, query, update } = makeRepository({
      id: 7,
      status: DealStatus.Draft,
      creator_id: 31,
      configurations: [{ id: "already-committed" }],
    });

    await expect(
      repository.mutateDealConfigurations(7, DealStatus.Draft, {
        kind: "creator",
        userId: 31,
      }, {
        type: "append",
        configurations: [{ id: "new" }],
      }),
    ).resolves.toBe("updated");

    expect(query.mock.invocationCallOrder[0]).toBeLessThan(
      update.mock.invocationCallOrder[0],
    );
    expect(update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Draft, creator_id: 31 },
      {
        configurations: [
          { id: "already-committed" },
          { id: "new" },
        ],
        status: DealStatus.Draft,
      },
    );
  });

  it("increments amount instead of duplicating a saved configuration", async () => {
    const { repository, update } = makeRepository({
      id: 7,
      status: DealStatus.Registered,
      creator_id: 31,
      configurations: [
        {
          id: "stored-id",
          amount: 2,
          components: [{ id: "memory", amount: 4 }],
          meta: { draftId: 91, draftConfigurationId: "server-1" },
        },
      ],
    });

    await expect(
      repository.mutateDealConfigurations(
        7,
        DealStatus.Registered,
        { kind: "creator", userId: 31 },
        {
          type: "append",
          configurations: [
            {
              id: "new-random-id",
              amount: 3,
              components: [{ id: "changed", amount: 1 }],
              meta: { draftId: "91", draftConfigurationId: "server-1" },
            },
          ],
        },
      ),
    ).resolves.toBe("updated");

    expect(update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Registered, creator_id: 31 },
      {
        configurations: [
          {
            id: "stored-id",
            amount: 5,
            components: [{ id: "memory", amount: 4 }],
            meta: { draftId: 91, draftConfigurationId: "server-1" },
          },
        ],
        status: DealStatus.Moderation,
      },
    );
  });

  it("removes a configuration from a JSON string returned by the driver", async () => {
    const { repository, update } = makeRepository({
      id: 7,
      status: DealStatus.Moderation,
      creator_id: 31,
      configurations: JSON.stringify([{ id: "keep" }, { id: "remove" }]),
    });

    await expect(
      repository.mutateDealConfigurations(7, DealStatus.Moderation, {
        kind: "creator",
        userId: 31,
      }, {
        type: "remove",
        configurationId: "remove",
      }),
    ).resolves.toBe("updated");

    expect(update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Moderation, creator_id: 31 },
      {
        configurations: [{ id: "keep" }],
        status: DealStatus.Moderation,
      },
    );
  });

  it("replaces the matching configuration and preserves its URL id", async () => {
    const { repository, update } = makeRepository({
      id: 7,
      status: DealStatus.Registered,
      creator_id: 31,
      configurations: [{ id: "replace", name: "old" }],
    });

    await expect(
      repository.mutateDealConfigurations(7, DealStatus.Registered, {
        kind: "creator",
        userId: 31,
      }, {
        type: "replace",
        configurationId: "replace",
        configuration: { id: "payload-id", name: "new" },
      }),
    ).resolves.toBe("updated");

    expect(update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Registered, creator_id: 31 },
      {
        configurations: [{ id: "replace", name: "new" }],
        status: DealStatus.Moderation,
      },
    );
  });

  it("does not write when remove or replace targets an absent configuration", async () => {
    const { repository, update } = makeRepository({
      id: 7,
      status: DealStatus.Draft,
      creator_id: 31,
      configurations: [{ id: "keep" }],
    });

    await expect(
      repository.mutateDealConfigurations(7, DealStatus.Draft, {
        kind: "creator",
        userId: 31,
      }, {
        type: "remove",
        configurationId: "missing",
      }),
    ).resolves.toBe("configuration_not_found");

    expect(update).not.toHaveBeenCalled();
  });

  it("reauthorizes the assigned manager under the row lock", async () => {
    const { repository, update } = makeRepository({
      id: 7,
      status: DealStatus.Moderation,
      creator_id: 31,
      responsible_manager_id: 44,
      configurations: [],
    });

    await expect(
      repository.mutateDealConfigurations(
        7,
        DealStatus.Moderation,
        { kind: "responsible_manager", userId: 44 },
        { type: "append", configurations: [{ id: "vendor" }] },
      ),
    ).resolves.toBe("updated");

    expect(update).toHaveBeenCalledWith(
      {
        id: 7,
        status: DealStatus.Moderation,
        responsible_manager_id: 44,
      },
      expect.objectContaining({ configurations: [{ id: "vendor" }] }),
    );
  });

  it("rejects a manager after the responsibility snapshot changed", async () => {
    const { repository, update } = makeRepository({
      id: 7,
      status: DealStatus.Moderation,
      creator_id: 31,
      responsible_manager_id: 45,
      configurations: [],
    });

    await expect(
      repository.mutateDealConfigurations(
        7,
        DealStatus.Moderation,
        { kind: "responsible_manager", userId: 44 },
        { type: "append", configurations: [{ id: "forbidden" }] },
      ),
    ).resolves.toBe("stale");
    expect(update).not.toHaveBeenCalled();
  });
});
