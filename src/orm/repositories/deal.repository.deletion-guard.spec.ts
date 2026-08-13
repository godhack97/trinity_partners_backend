import { DealRepository } from "./deal.repository";
import { DealEntity } from "@orm/entities";
import { DealDeletionStatus } from "@orm/entities/deal-deletion-request.entity";

describe("DealRepository atomic deletion", () => {
  const makeRepository = (options: {
    pendingReference?: boolean;
    requestStatus?: DealDeletionStatus;
    softDeleteAffected?: number;
  } = {}) => {
    const state = {
      requestStatus: options.requestStatus ?? DealDeletionStatus.PENDING,
      deleted: false,
    };
    const events: string[] = [];

    const query = jest.fn(async (sql: string, parameters: any[] = []) => {
      if (sql.includes("FROM deal_deletion_requests") && sql.includes("SELECT")) {
        return [{ id: parameters[0], status: state.requestStatus }];
      }
      if (sql.includes("FROM deals") && sql.includes("duplicate_of_deal_id")) {
        return options.pendingReference ? [{ id: 501 }] : [];
      }
      if (sql.includes("UPDATE deal_deletion_requests")) {
        events.push("approve-request");
        state.requestStatus = parameters[0];
        return { affectedRows: 1 };
      }
      return [];
    });
    const softDelete = jest.fn(async () => {
      events.push("soft-delete");
      const affected = options.softDeleteAffected ?? 1;
      if (affected) state.deleted = true;
      return { affected };
    });
    const manager: any = {
      query,
      getRepository: jest.fn((entity) => {
        expect(entity).toBe(DealEntity);
        return { softDelete };
      }),
    };
    const transaction = jest.fn(async (work) => {
      const snapshot = { ...state };
      try {
        return await work(manager);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    });
    const repository = {
      manager: { transaction },
    } as unknown as DealRepository;
    Object.setPrototypeOf(repository, DealRepository.prototype);

    return { repository, state, events, query, softDelete, transaction };
  };

  it("approves the request and soft-deletes the deal in one transaction", async () => {
    const deps = makeRepository();

    await expect(
      DealRepository.prototype.approveDeletionRequestAndSoftDelete.call(
        deps.repository,
        41,
        101,
        1,
        "7707083893",
      ),
    ).resolves.toBe("deleted");

    expect(deps.transaction).toHaveBeenCalledTimes(1);
    expect(deps.state).toEqual({
      requestStatus: DealDeletionStatus.APPROVED,
      deleted: true,
    });
    expect(deps.events).toEqual(["approve-request", "soft-delete"]);
  });

  it("rolls request approval back when the guarded soft-delete loses its race", async () => {
    const deps = makeRepository({ softDeleteAffected: 0 });

    await expect(
      DealRepository.prototype.approveDeletionRequestAndSoftDelete.call(
        deps.repository,
        41,
        101,
        1,
        "7707083893",
      ),
    ).resolves.toBe("stale");

    expect(deps.state).toEqual({
      requestStatus: DealDeletionStatus.PENDING,
      deleted: false,
    });
    expect(deps.events).toEqual(["approve-request", "soft-delete"]);
  });
});
