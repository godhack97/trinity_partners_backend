import {
  Bitrix24SyncStatus,
  DealEntity,
} from "@orm/entities";
import { Brackets } from "typeorm";
import {
  BITRIX24_SYNC_LEASE_MS,
  DealRepository,
} from "./deal.repository";

describe("DealRepository Bitrix24 sync lease", () => {
  const createRepository = () =>
    new DealRepository({
      target: DealEntity,
      manager: {},
      queryRunner: undefined,
    } as any);

  const createUpdateQuery = (affected: number) => {
    const conditions: Array<{ sql: string; params?: Record<string, unknown> }> =
      [];
    const visitCondition = (
      condition: string | Brackets,
      params?: Record<string, unknown>,
    ) => {
      if (condition instanceof Brackets) {
        const expression = {
          where: jest.fn((nested, nestedParams) => {
            visitCondition(nested, nestedParams);
            return expression;
          }),
          andWhere: jest.fn((nested, nestedParams) => {
            visitCondition(nested, nestedParams);
            return expression;
          }),
          orWhere: jest.fn((nested, nestedParams) => {
            visitCondition(nested, nestedParams);
            return expression;
          }),
        };
        (condition as any).whereFactory(expression);
      } else {
        conditions.push({ sql: condition, params });
      }
    };
    const query: any = {
      update: jest.fn(() => query),
      set: jest.fn(() => query),
      where: jest.fn((condition, params) => {
        visitCondition(condition, params);
        return query;
      }),
      andWhere: jest.fn((condition, params) => {
        visitCondition(condition, params);
        return query;
      }),
      execute: jest.fn().mockResolvedValue({ affected }),
    };
    return { query, conditions };
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns no claim to a concurrent loser", async () => {
    const repository = createRepository();
    const { query } = createUpdateQuery(0);
    jest.spyOn(repository, "createQueryBuilder").mockReturnValue(query);
    const findById = jest.spyOn(repository, "findById");

    await expect(repository.claimBitrix24Sync(41)).resolves.toBeNull();

    expect(query.set).toHaveBeenCalledWith(
      expect.objectContaining({
        bitrix24_sync_status: Bitrix24SyncStatus.PROCESSING,
        bitrix24_sync_started_at: expect.any(Date),
        bitrix24_sync_token: expect.any(String),
      }),
    );
    expect(findById).not.toHaveBeenCalled();
  });

  it("makes an expired processing lease atomically reclaimable", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-12T12:00:00.000Z"));
    const repository = createRepository();
    const { query, conditions } = createUpdateQuery(1);
    jest.spyOn(repository, "createQueryBuilder").mockReturnValue(query);
    jest.spyOn(repository, "findById").mockResolvedValue({ id: 41 } as any);

    await expect(repository.claimBitrix24Sync(41)).resolves.toEqual({
      deal: { id: 41 },
      token: expect.any(String),
    });

    expect(conditions).toContainEqual({
      sql: "bitrix24_sync_status = :processingStatus",
      params: { processingStatus: Bitrix24SyncStatus.PROCESSING },
    });
    expect(conditions).toContainEqual({
      sql: "bitrix24_sync_started_at < :staleBefore",
      params: {
        staleBefore: new Date(
          Date.parse("2026-08-12T12:00:00.000Z") - BITRIX24_SYNC_LEASE_MS,
        ),
      },
    });
  });

  it("finalizes only the worker that still owns the lease token", async () => {
    const repository = createRepository();
    const { query, conditions } = createUpdateQuery(0);
    jest.spyOn(repository, "createQueryBuilder").mockReturnValue(query);

    await expect(
      repository.finishBitrix24Sync(
        { deal: { id: 41 } as DealEntity, token: "expired-worker-token" },
        { success: true, bitrix24LeadId: 555 },
      ),
    ).resolves.toBe(false);

    expect(conditions).toContainEqual({
      sql: "bitrix24_sync_token = :token",
      params: { token: "expired-worker-token" },
    });
  });
});
