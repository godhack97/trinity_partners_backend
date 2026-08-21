import { SearchDealDto } from "@api/deal/dto/request/search-deal.dto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Bitrix24SyncStatus,
  DealEntity,
  DealStatus,
} from "@orm/entities";
import { DealDeletionStatus } from "@orm/entities/deal-deletion-request.entity";
import { randomUUID } from "node:crypto";
import {
  Between,
  Brackets,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Repository,
} from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

class StaleDeletionApprovalError extends Error {}
class StaleDealContentUpdateError extends Error {}

function normalizeConfigurationAmount(amount: unknown) {
  const parsedAmount = Number(amount);
  return Number.isFinite(parsedAmount) && parsedAmount >= 1
    ? Math.trunc(parsedAmount)
    : 1;
}

function getConfigurationSourceKey(configuration: unknown) {
  if (!configuration || typeof configuration !== "object") return null;

  const meta = (configuration as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object") return null;

  const { draftId, draftConfigurationId } = meta as {
    draftId?: unknown;
    draftConfigurationId?: unknown;
  };
  if (
    draftId === undefined ||
    draftId === null ||
    draftConfigurationId === undefined ||
    draftConfigurationId === null
  ) {
    return null;
  }

  return `${String(draftId)}:${String(draftConfigurationId)}`;
}

function mergeConfigurationsBySource(
  currentConfigurations: unknown[],
  incomingConfigurations: unknown[],
) {
  const mergedConfigurations: unknown[] = [];
  const configurationIndexes = new Map<string, number>();

  for (const configuration of [
    ...currentConfigurations,
    ...incomingConfigurations,
  ]) {
    const sourceKey = getConfigurationSourceKey(configuration);
    const existingIndex = sourceKey
      ? configurationIndexes.get(sourceKey)
      : undefined;

    if (existingIndex === undefined) {
      if (sourceKey) {
        configurationIndexes.set(sourceKey, mergedConfigurations.length);
      }
      mergedConfigurations.push(configuration);
      continue;
    }

    const existingConfiguration = mergedConfigurations[existingIndex] as
      | Record<string, unknown>
      | undefined;
    const incomingConfiguration = configuration as Record<string, unknown>;
    mergedConfigurations[existingIndex] = {
      ...existingConfiguration,
      amount:
        normalizeConfigurationAmount(existingConfiguration?.amount) +
        normalizeConfigurationAmount(incomingConfiguration.amount),
    };
  }

  return mergedConfigurations;
}

export const BITRIX24_SYNC_LEASE_MS = 10 * 60 * 1000;

export interface Bitrix24SyncClaim {
  deal: DealEntity;
  token: string;
}

export type DealConfigurationMutation =
  | { type: "append"; configurations: unknown[] }
  | { type: "remove"; configurationId: string }
  | {
      type: "replace";
      configurationId: string;
      configuration: Record<string, unknown>;
    };

export type DealConfigurationMutationResult =
  | "updated"
  | "configuration_not_found"
  | "stale";

export type DealConfigurationMutationActor =
  | { kind: "creator"; userId: number }
  | { kind: "responsible_manager"; userId: number }
  | { kind: "super_admin"; userId: number };

export interface DealSubmitExpectedParticipants {
  distributorId?: number | null;
  distributorCompanyId?: number | null;
  integratorCompanyId?: number | null;
  integratorName?: string | null;
  integratorInn?: string | null;
}

@Injectable()
export class DealRepository extends Repository<DealEntity> {
  constructor(
    @InjectRepository(DealEntity)
    private repo: Repository<DealEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async countDealsForToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await this.count({
      where: {
        created_at: Between(startOfDay, endOfDay),
      },
    });
  }

  public async findById(id: number) {
    const deal = await this.createQueryBuilder("deal")
      .leftJoinAndSelect("deal.distributor", "distributor")
      .leftJoinAndSelect("deal.distributor_company", "distributor_company")
      .leftJoinAndSelect("deal.integrator_company", "integrator_company")
      .leftJoinAndSelect("deal.customer", "customer")
      .leftJoinAndSelect("deal.partner", "partner")
      .leftJoinAndSelect("deal.creator_company", "creator_company")
      .leftJoinAndSelect("partner.role", "role")
      .leftJoinAndSelect("partner.user_info", "partner_user_info")
      .leftJoinAndSelect("partner.manager", "manager")
      .leftJoinAndSelect("manager.role", "manager_role")
      .leftJoinAndSelect("manager.user_info", "manager_user_info")
      .leftJoinAndSelect("deal.responsible_manager", "responsible_manager")
      .leftJoinAndSelect(
        "responsible_manager.user_info",
        "responsible_manager_user_info",
      )
      .where("deal.id = :id", { id })
      .getOne();

    if (deal?.partner?.lazy_owner_company) {
      deal.partner.owner_company = await deal.partner.lazy_owner_company;
    }

    return deal;
  }

  /**
   * Atomically acquires a fenced lease for a single Bitrix24 lead sync.
   * A token, rather than the timestamp alone, prevents an expired worker from
   * overwriting the result of a newer worker that reclaimed the lease.
   */
  public async claimBitrix24Sync(
    dealId: number,
    force = false,
    leaseMs = BITRIX24_SYNC_LEASE_MS,
  ): Promise<Bitrix24SyncClaim | null> {
    const token = randomUUID();
    const startedAt = new Date();
    const staleBefore = new Date(startedAt.getTime() - leaseMs);
    const claimableStatuses = [
      Bitrix24SyncStatus.PENDING,
      Bitrix24SyncStatus.FAILED,
      ...(force ? [Bitrix24SyncStatus.SYNCED] : []),
    ];

    const result = await this.createQueryBuilder()
      .update(DealEntity)
      .set({
        bitrix24_sync_status: Bitrix24SyncStatus.PROCESSING,
        bitrix24_sync_started_at: startedAt,
        bitrix24_sync_token: token,
      })
      .where("id = :dealId", { dealId })
      .andWhere("deleted_at IS NULL")
      .andWhere("status != :draftStatus", { draftStatus: DealStatus.Draft })
      .andWhere(
        new Brackets((query) => {
          query
            .where("bitrix24_sync_status IN (:...claimableStatuses)", {
              claimableStatuses,
            })
            .orWhere("bitrix24_sync_status IS NULL")
            .orWhere(
              new Brackets((staleLease) => {
                staleLease
                  .where("bitrix24_sync_status = :processingStatus", {
                    processingStatus: Bitrix24SyncStatus.PROCESSING,
                  })
                  .andWhere(
                    new Brackets((missingOrStaleStart) => {
                      missingOrStaleStart
                        .where("bitrix24_sync_started_at IS NULL")
                        .orWhere("bitrix24_sync_started_at < :staleBefore", {
                          staleBefore,
                        });
                    }),
                  );
              }),
            );
        }),
      )
      .execute();

    if (!result.affected) return null;

    const deal = await this.findById(dealId);
    if (deal) return { deal, token };

    // Keep a claimed-but-unloadable record retryable. The token condition is
    // the fence: it cannot release a lease that another worker already owns.
    await this.finishBitrix24Sync(
      { deal: { id: dealId } as DealEntity, token },
      { success: false },
    );
    return null;
  }

  public async finishBitrix24Sync(
    claim: Bitrix24SyncClaim,
    outcome: { success: boolean; bitrix24LeadId?: number },
  ): Promise<boolean> {
    const patch: QueryDeepPartialEntity<DealEntity> = {
      bitrix24_sync_status: outcome.success
        ? Bitrix24SyncStatus.SYNCED
        : Bitrix24SyncStatus.FAILED,
      bitrix24_sync_started_at: null,
      bitrix24_sync_token: null,
    };

    if (outcome.success) {
      patch.bitrix24_synced_at = new Date();
      if (outcome.bitrix24LeadId) {
        patch.bitrix24_deal_id = outcome.bitrix24LeadId;
      }
    }

    const result = await this.createQueryBuilder()
      .update(DealEntity)
      .set(patch)
      .where("id = :dealId", { dealId: claim.deal.id })
      .andWhere("bitrix24_sync_status = :processingStatus", {
        processingStatus: Bitrix24SyncStatus.PROCESSING,
      })
      .andWhere("bitrix24_sync_token = :token", { token: claim.token })
      .execute();

    return Boolean(result.affected);
  }

  public async findBitrix24SyncCandidates(
    leaseMs = BITRIX24_SYNC_LEASE_MS,
  ): Promise<DealEntity[]> {
    const staleBefore = new Date(Date.now() - leaseMs);

    return this.createQueryBuilder("deal")
      .where("deal.deleted_at IS NULL")
      .andWhere("deal.status != :draftStatus", {
        draftStatus: DealStatus.Draft,
      })
      .andWhere(
        new Brackets((query) => {
          query
            .where("deal.bitrix24_sync_status IN (:...retryableStatuses)", {
              retryableStatuses: [
                Bitrix24SyncStatus.PENDING,
                Bitrix24SyncStatus.FAILED,
              ],
            })
            .orWhere("deal.bitrix24_sync_status IS NULL")
            .orWhere(
              new Brackets((staleLease) => {
                staleLease
                  .where("deal.bitrix24_sync_status = :processingStatus", {
                    processingStatus: Bitrix24SyncStatus.PROCESSING,
                  })
                  .andWhere(
                    new Brackets((missingOrStaleStart) => {
                      missingOrStaleStart
                        .where("deal.bitrix24_sync_started_at IS NULL")
                        .orWhere(
                          "deal.bitrix24_sync_started_at < :staleBefore",
                          { staleBefore },
                        );
                    }),
                  );
              }),
            );
        }),
      )
      .orderBy("deal.bitrix24_sync_started_at", "ASC")
      .addOrderBy("deal.id", "ASC")
      .getMany();
  }

  /**
   * Atomically submits one draft while verifying that its participants did not
   * change between validation and persistence. Customer INN is intentionally
   * not compared with other deals: multiple deals for one customer are valid.
   */
  public async submitDraft(
    dealId: number,
    submitPatch: QueryDeepPartialEntity<DealEntity>,
    expectedParticipants?: DealSubmitExpectedParticipants,
  ): Promise<boolean> {
    return this.manager.transaction(async (manager) => {
      const lockedDeals = await manager.query(
        `SELECT deal.status,
                deal.distributor_id,
                deal.distributor_company_id,
                deal.integrator_company_id,
                deal.integrator_name,
                deal.integrator_inn
         FROM deals deal
         WHERE deal.id = ? AND deal.deleted_at IS NULL
         FOR UPDATE`,
        [dealId],
      );
      const lockedDeal = lockedDeals?.[0];
      if (!lockedDeal || lockedDeal.status !== DealStatus.Draft) return false;

      if (
        expectedParticipants &&
        (Number(lockedDeal.distributor_id || 0) !==
          Number(expectedParticipants.distributorId || 0) ||
          Number(lockedDeal.distributor_company_id || 0) !==
            Number(expectedParticipants.distributorCompanyId || 0) ||
          Number(lockedDeal.integrator_company_id || 0) !==
            Number(expectedParticipants.integratorCompanyId || 0) ||
          `${lockedDeal.integrator_name || ""}`.trim() !==
            `${expectedParticipants.integratorName || ""}`.trim() ||
          `${lockedDeal.integrator_inn || ""}`.trim() !==
            `${expectedParticipants.integratorInn || ""}`.trim())
      ) {
        return false;
      }

      const result = await manager.getRepository(DealEntity).update(
        { id: dealId, status: DealStatus.Draft },
        submitPatch,
      );
      return Boolean(result.affected);
    });
  }

  public async updateDealAndCustomerSnapshot(
    deal: DealEntity,
    dealPatch: QueryDeepPartialEntity<DealEntity>,
    customerPatch: Record<string, unknown>,
  ) {
    try {
      return await this.manager.transaction(async (manager) => {
        const previousInn = `${deal.customer?.inn_normalized || ""}`.trim();
        const nextInn = `${customerPatch.inn_normalized || ""}`.trim();
        const customerInnChanged = Boolean(
          nextInn && nextInn !== previousInn,
        );
        const effectiveCustomerPatch = customerInnChanged
          ? { ...customerPatch, bitrix24_company_id: null }
          : customerPatch;
        if (customerInnChanged) {
          // Keep one global order for simultaneous A→B and B→A edits and use
          // the same registry→deal ordering as submit/delete.
          const innsToLock = [...new Set([previousInn, nextInn].filter(Boolean))]
            .sort();
          for (const inn of innsToLock) {
            await this.lockDuplicateRegistry(manager, inn);
          }
        }

        const lockedDeals = await manager.query(
          `SELECT id, status, customer_id
           FROM deals
           WHERE id = ? AND deleted_at IS NULL
           FOR UPDATE`,
          [deal.id],
        );
        const lockedDeal = lockedDeals?.[0];
        if (
          !lockedDeal ||
          lockedDeal.status !== deal.status ||
          Number(lockedDeal.customer_id) !== Number(deal.customer_id)
        ) {
          throw new StaleDealContentUpdateError();
        }

        let customerId = deal.customer_id;
        if (Object.keys(effectiveCustomerPatch).length) {
          const customerRepository = manager.getRepository("customers");
          const currentCustomerRows = await manager.query(
            `SELECT * FROM customers WHERE id = ? FOR UPDATE`,
            [deal.customer_id],
          );
          const currentCustomer = currentCustomerRows?.[0];
          if (!currentCustomer) throw new StaleDealContentUpdateError();

          const referenceCount = await manager
            .getRepository(DealEntity)
            .count({ where: { customer_id: deal.customer_id } });

          if (referenceCount > 1) {
            const clonedCustomer = await customerRepository.save({
              ...currentCustomer,
              id: undefined,
              created_at: undefined,
              updated_at: undefined,
              deleted_at: undefined,
              ...effectiveCustomerPatch,
            });
            customerId = Number(clonedCustomer.id);
            dealPatch.customer_id = customerId;
          } else {
            await customerRepository.update(
              deal.customer_id,
              effectiveCustomerPatch,
            );
          }
        }

        const result = await manager.getRepository(DealEntity).update(
          {
            id: deal.id,
            status: deal.status,
            customer_id: deal.customer_id,
          },
          dealPatch,
        );
        if (!result.affected) throw new StaleDealContentUpdateError();
        return { customerId };
      });
    } catch (error) {
      if (error instanceof StaleDealContentUpdateError) return null;
      throw error;
    }
  }

  /**
   * Mutates the JSON configuration collection while holding the deal row lock.
   *
   * Submit locks the INN registry and then this same deal row. Configuration
   * edits do not touch the registry, so locking only the deal here preserves
   * that global order without introducing a reverse deal -> registry edge.
   * Reading the JSON after acquiring the lock also prevents two simultaneous
   * configuration edits from overwriting each other with stale collections.
   */
  public async mutateDealConfigurations(
    dealId: number,
    expectedStatus: DealStatus,
    actor: DealConfigurationMutationActor,
    mutation: DealConfigurationMutation,
  ): Promise<DealConfigurationMutationResult> {
    return this.manager.transaction(async (manager) => {
      const rows = await manager.query(
        `SELECT id, status, creator_id, responsible_manager_id, configurations
         FROM deals
         WHERE id = ? AND deleted_at IS NULL
         FOR UPDATE`,
        [dealId],
      );
      const lockedDeal = rows?.[0];
      if (
        !lockedDeal ||
        lockedDeal.status !== expectedStatus
      ) {
        return "stale";
      }
      const actorIsAuthorized =
        actor.kind === "super_admin" ||
        (actor.kind === "creator" &&
          Number(lockedDeal.creator_id) === Number(actor.userId)) ||
        (actor.kind === "responsible_manager" &&
          Number(lockedDeal.responsible_manager_id) === Number(actor.userId));
      if (!actorIsAuthorized) return "stale";

      let storedConfigurations: unknown = lockedDeal.configurations;
      if (typeof storedConfigurations === "string") {
        try {
          storedConfigurations = JSON.parse(storedConfigurations);
        } catch {
          storedConfigurations = [];
        }
      }
      const currentConfigurations = Array.isArray(storedConfigurations)
        ? storedConfigurations
        : [];

      let nextConfigurations: unknown[];
      if (mutation.type === "append") {
        nextConfigurations = mergeConfigurationsBySource(
          currentConfigurations,
          mutation.configurations,
        );
      } else {
        let matched = false;
        nextConfigurations = currentConfigurations.flatMap(
          (configuration: any) => {
            if (configuration?.id !== mutation.configurationId) {
              return [configuration];
            }
            matched = true;
            if (mutation.type === "remove") return [];
            return [
              {
                ...mutation.configuration,
                id: mutation.configurationId,
              },
            ];
          },
        );

        if (!matched) return "configuration_not_found";
      }

      const nextStatus =
        lockedDeal.status === DealStatus.Draft ||
        lockedDeal.status === DealStatus.Moderation
          ? lockedDeal.status
          : DealStatus.Moderation;
      const updateCriteria: Record<string, unknown> = {
        id: dealId,
        status: expectedStatus,
      };
      if (actor.kind === "creator") updateCriteria.creator_id = actor.userId;
      if (actor.kind === "responsible_manager") {
        updateCriteria.responsible_manager_id = actor.userId;
      }
      const result = await manager.getRepository(DealEntity).update(
        updateCriteria,
        {
          configurations: nextConfigurations,
          status: nextStatus,
        },
      );

      return result.affected ? "updated" : "stale";
    });
  }

  private async lockDuplicateRegistry(manager: any, normalizedInn?: string | null) {
    if (!normalizedInn) return;
    await manager.query(
      `INSERT INTO deal_customer_inn_registry
        (inn_normalized, canonical_deal_id, created_at, updated_at)
       VALUES (?, NULL, NOW(), NOW())
       ON DUPLICATE KEY UPDATE updated_at = updated_at`,
      [normalizedInn],
    );
    await manager.query(
      `SELECT canonical_deal_id
       FROM deal_customer_inn_registry
       WHERE inn_normalized = ?
       FOR UPDATE`,
      [normalizedInn],
    );
  }

  public async softDeleteWithDuplicateGuard(
    dealId: number,
    _normalizedInn?: string | null,
  ) {
    const result = await this.softDelete(dealId);
    return Boolean(result.affected);
  }

  public async approveDeletionRequestAndSoftDelete(
    requestId: number,
    dealId: number,
    processedById: number,
    _normalizedInn?: string | null,
  ): Promise<"deleted" | "blocked" | "stale"> {
    try {
      return await this.manager.transaction(async (manager) => {
        const requests = await manager.query(
          `SELECT id, status
           FROM deal_deletion_requests
           WHERE id = ? AND deal_id = ?
           FOR UPDATE`,
          [requestId, dealId],
        );
        if (requests?.[0]?.status !== DealDeletionStatus.PENDING) return "stale";
        await manager.query(
          `UPDATE deal_deletion_requests
           SET status = ?, processed_by_id = ?, processed_at = NOW()
           WHERE id = ? AND status = ?`,
          [
            DealDeletionStatus.APPROVED,
            processedById,
            requestId,
            DealDeletionStatus.PENDING,
          ],
        );
        const result = await manager.getRepository(DealEntity).softDelete(dealId);
        if (!result.affected) {
          // Returning here would commit the approved request without deleting
          // its deal. Throw inside the transaction so both writes roll back.
          throw new StaleDeletionApprovalError();
        }
        return "deleted";
      });
    } catch (error) {
      if (error instanceof StaleDeletionApprovalError) return "stale";
      throw error;
    }
  }

  public async findDealsWithFilters(
    entry?: SearchDealDto,
    creatorIds?: number[],
    alwaysIncludeCreatorId?: number,
  ): Promise<DealEntity[]> {
    if (creatorIds && creatorIds.length === 0) {
      return [];
    }

    const queryBuilder = this.createQueryBuilder("deal")
      .leftJoinAndSelect("deal.distributor", "distributor")
      .leftJoinAndSelect("deal.distributor_company", "distributor_company")
      .leftJoinAndSelect("deal.integrator_company", "integrator_company")
      .leftJoinAndSelect("deal.customer", "customer")
      .leftJoinAndSelect("deal.partner", "partner")
      .leftJoinAndSelect("deal.creator_company", "creator_company")
      .leftJoinAndSelect("partner.role", "role")
      .leftJoinAndSelect("partner.user_info", "partner_user_info")
      .leftJoinAndSelect("partner.manager", "manager")
      .leftJoinAndSelect("deal.responsible_manager", "responsible_manager")
      .leftJoinAndSelect(
        "responsible_manager.user_info",
        "responsible_manager_user_info",
      )
      .leftJoin(
        "deal_deletion_requests",
        "deletion_request",
        "deletion_request.deal_id = deal.id AND deletion_request.status = :pendingStatus",
        { pendingStatus: DealDeletionStatus.PENDING },
      )
      .addSelect(
        "CASE WHEN deletion_request.id IS NOT NULL THEN 'yes' ELSE 'no' END",
        "delete_request_status",
      );

    if (creatorIds) {
      queryBuilder.andWhere("deal.creator_id IN (:...creatorIds)", {
        creatorIds,
      });
    }

    if (entry?.startDate && entry?.endDate) {
      queryBuilder.andWhere(
        "deal.purchase_date BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(entry.startDate),
          endDate: new Date(entry.endDate),
        },
      );
    } else if (entry?.startDate) {
      queryBuilder.andWhere("deal.purchase_date >= :startDate", {
        startDate: new Date(entry.startDate),
      });
    } else if (entry?.endDate) {
      queryBuilder.andWhere("deal.purchase_date <= :endDate", {
        endDate: new Date(entry.endDate),
      });
    }

    if (entry?.status) {
      queryBuilder.andWhere("deal.status = :status", { status: entry.status });
    }

    if (entry?.duplicateReviewStatus) {
      queryBuilder.andWhere(
        "deal.duplicate_review_status = :duplicateReviewStatus",
        { duplicateReviewStatus: entry.duplicateReviewStatus },
      );
    }

    if (entry?.distributorId) {
      queryBuilder.andWhere("deal.distributor_id = :distributorId", {
        distributorId: entry.distributorId,
      });
    }

    if (entry?.distributorCompanyId) {
      queryBuilder.andWhere(
        "deal.distributor_company_id = :distributorCompanyId",
        { distributorCompanyId: entry.distributorCompanyId },
      );
    }

    if (entry?.companyId) {
      queryBuilder.andWhere(
        `(deal.integrator_company_id = :companyId
          OR deal.distributor_company_id = :companyId
          OR deal.creator_company_id = :companyId
          ${alwaysIncludeCreatorId ? "OR deal.creator_id = :alwaysIncludeCreatorId" : ""})`,
        {
          companyId: entry.companyId,
          ...(alwaysIncludeCreatorId ? { alwaysIncludeCreatorId } : {}),
        },
      );
    }

    if (entry?.search) {
      const search = `%${entry.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        "(LOWER(deal.deal_num) LIKE :search OR LOWER(deal.deal_sum) LIKE :search OR LOWER(deal.title) LIKE :search)",
        { search },
      );
    }

    const result = await queryBuilder.getRawAndEntities();

    const deals = [];

    for (let i = 0; i < result.entities.length; i++) {
      const deal = result.entities[i];
      const raw = result.raw[i];

      const partner = deal.partner;
      if (partner && partner.lazy_owner_company) {
        const partnerCompany = await partner.lazy_owner_company;
        deal.partner.owner_company = partnerCompany;
      }

      const dealWithStatus = Object.assign(deal, {
        delete_request_status: raw.delete_request_status,
      });

      deals.push(dealWithStatus);
    }

    return deals;
  }
}
