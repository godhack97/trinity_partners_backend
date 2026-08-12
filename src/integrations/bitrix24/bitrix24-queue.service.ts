// src/integrations/bitrix24/bitrix24-queue.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Bitrix24Service } from "./bitrix24.service";
import {
  DealRepository,
  UserRepository,
} from "@orm/repositories";
import { Bitrix24SyncStatus, DealStatus } from "@orm/entities";
import { Not } from "typeorm";
import { UserActionsService } from "../../logs/user-actions.service";

@Injectable()
export class Bitrix24QueueService {
  private readonly logger = new Logger(Bitrix24QueueService.name);

  constructor(
    private readonly bitrix24Service: Bitrix24Service,
    private readonly dealRepository: DealRepository,
    private readonly userRepository: UserRepository,
    private readonly userActionsService: UserActionsService,
  ) {}

  /**
   * Крон-задача для синхронизации неотправленных лидов
   * Запускается каждые 5 минут
   */
  @Cron("*/5 * * * *")
  async syncPendingLeads(): Promise<void> {
    this.logger.log(
      "Начинаем синхронизацию неотправленных лидов с Bitrix24...",
    );

    try {
      const allDealsToSync =
        await this.dealRepository.findBitrix24SyncCandidates();

      this.logger.log(
        `Найдено ${allDealsToSync.length} лидов для синхронизации`,
      );

      for (const deal of allDealsToSync) {
        await this.syncSingleLead(deal);
        await this.delay(500);
      }

      this.logger.log("Синхронизация лидов завершена");
    } catch (error) {
      this.logger.error("Ошибка при синхронизации лидов:", error);
    }
  }

  /**
   * Синхронизация одного лида
   */
  private async syncSingleLead(
    candidate: any,
    force = false,
  ): Promise<boolean> {
    if (candidate.status === DealStatus.Draft) {
      this.logger.warn(
        `Черновик сделки ${candidate.id} не отправлен в Bitrix24`,
      );
      return false;
    }

    const claim = await this.dealRepository.claimBitrix24Sync(
      candidate.id,
      force,
    );
    if (!claim) {
      this.logger.warn(
        `Сделка ${candidate.id} уже синхронизируется другим процессом`,
      );
      return false;
    }
    const deal = claim.deal;

    try {
      this.logger.log(`Синхронизируем лид для сделки ID: ${deal.id}`);

      const user = await this.userRepository.findOneBy({ id: deal.creator_id });
      if (!user) {
        this.logger.error(`Пользователь не найден для сделки ${deal.id}`);

        await this.dealRepository.finishBitrix24Sync(claim, {
          success: false,
        });

        this.userActionsService.log(0, "bitrix24_contact_notfound", {
          entity: "deals",
          params: {
            id: deal.id,
          },
          bitrix24_contact_id: deal.creator_id,
          deal_id: deal.id,
          id: deal.id,
        });

        return false;
      }

      let contactId = user.bitrix24_contact_id;

      if (!contactId) {
        this.logger.log(
          `Создаем контакт в Bitrix24 для пользователя ${user.id}`,
        );
        contactId = await this.bitrix24Service.createContact(user);

        if (contactId) {
          await this.userRepository.update(user.id, {
            bitrix24_contact_id: contactId,
          });
          this.logger.log(
            `Контакт создан и сохранен для пользователя ${user.id} с ID: ${contactId}`,
          );

          this.userActionsService.log(user.id, "bitrix24_contact_created", {
            entity: "users",
            params: {
              id: user.id,
            },
            bitrix24_contact_id: contactId,
            deal_id: deal.id,
          });
        } else {
          this.logger.error(
            `Не удалось создать контакт для пользователя ${user.id}`,
          );

          this.userActionsService.log(
            user.id,
            "bitrix24_contact_creation_failed",
            {
              entity: "users",
              params: {
                id: user.id,
              },
              deal_id: deal.id,
              error: `Не удалось создать контакт Bitrix24 для пользователя ${user.id}`,
            },
          );
        }
      }

      let distributorName: string | undefined;
      if (deal.distributor_company?.name) {
        distributorName = deal.distributor_company.name;
      } else if (deal.distributor?.name) {
        distributorName = deal.distributor.name;
      } else if (deal.distributor_company_id) {
        distributorName = `DistributorCompany_${deal.distributor_company_id}`;
      } else if (deal.distributor_id) {
        distributorName = `Distributor_${deal.distributor_id}`;
      }

      let bitrixLeadId: number | null = null;
      if (deal.bitrix24_deal_id) {
        const updated = await this.bitrix24Service.updateLead(
          deal.bitrix24_deal_id,
          deal,
          distributorName,
          contactId,
        );
        bitrixLeadId = updated ? deal.bitrix24_deal_id : null;
      } else {
        bitrixLeadId = await this.bitrix24Service.createLead(
          deal,
          deal.customer,
          distributorName,
          contactId,
        );
      }

      if (bitrixLeadId) {
        const persisted = await this.dealRepository.finishBitrix24Sync(claim, {
          success: true,
          bitrix24LeadId: bitrixLeadId,
        });

        if (!persisted) {
          this.logger.warn(
            `Результат синхронизации сделки ${deal.id} отклонен: аренда истекла`,
          );
          return false;
        }

        this.logger.log(
          `Лид для сделки ${deal.id} синхронизирован в Bitrix24 с ID: ${bitrixLeadId}`,
        );
        return true;
      } else {
        await this.dealRepository.finishBitrix24Sync(claim, {
          success: false,
        });

        this.logger.error(`Не удалось создать лид для сделки ${deal.id}`);

        this.userActionsService.log(
          deal.creator_id,
          "bitrix24_lead_sync_failed",
          {
            entity: "deals",
            params: {
              id: deal.id,
            },
            deal_id: deal.id,
            error: `Не удалось создать лид для сделки ${deal.id}`,
          },
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Ошибка синхронизации лида для сделки ${deal.id}:`,
        error,
      );

      await this.dealRepository.finishBitrix24Sync(claim, {
        success: false,
      });

      this.userActionsService.log(deal.creator_id, "bitrix24_lead_sync_error", {
        entity: "deals",
        params: {
          id: deal.id,
        },
        deal_id: deal.id,
        error:
          error.message || `Ошибка синхронизации лида для сделки ${deal.id}`,
      });
      return false;
    }
  }

  /**
   * Принудительная синхронизация конкретного лида
   */
  async forceSyncLead(dealId: number): Promise<boolean> {
    try {
      const deal = await this.dealRepository.findOneBy({ id: dealId });
      if (!deal) {
        this.logger.error(`Сделка ${dealId} не найдена`);
        return false;
      }

      if (deal.status === DealStatus.Draft) {
        this.logger.warn(`Черновик сделки ${dealId} нельзя синхронизировать`);
        return false;
      }

      this.userActionsService.log(
        deal.creator_id,
        "bitrix24_force_sync_started",
        {
          entity: "deals",
          params: {
            id: deal.id,
          },
          deal_id: dealId,
        },
      );

      return await this.syncSingleLead(deal, true);
    } catch (error) {
      this.logger.error(
        `Ошибка принудительной синхронизации лида для сделки ${dealId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Обновление существующего лида в Bitrix24
   */
  async updateLead(dealId: number, distributorName?: string): Promise<boolean> {
    try {
      const deal = await this.dealRepository.findOneBy({ id: dealId });
      if (!deal || !deal.bitrix24_deal_id) {
        this.logger.error(
          `Сделка ${dealId} не найдена или не имеет привязанного лида в Bitrix24`,
        );
        return false;
      }

      const user = await this.userRepository.findOneBy({ id: deal.creator_id });
      if (!user) {
        this.logger.error(`Пользователь не найден для сделки ${dealId}`);
        return false;
      }

      const success = await this.bitrix24Service.updateLead(
        deal.bitrix24_deal_id,
        deal,
        distributorName,
        user.bitrix24_contact_id,
      );

      if (success) {
        this.logger.log(`Лид ${deal.bitrix24_deal_id} успешно обновлен`);

        this.userActionsService.log(deal.creator_id, "bitrix24_lead_updated", {
          entity: "deals",
          params: {
            id: dealId,
          },
          deal_id: dealId,
          bitrix24_lead_id: deal.bitrix24_deal_id,
          distributor_name: distributorName,
        });
      } else {
        this.userActionsService.log(
          deal.creator_id,
          "bitrix24_lead_update_failed",
          {
            entity: "deals",
            params: {
              id: dealId,
            },
            deal_id: dealId,
            bitrix24_lead_id: deal.bitrix24_deal_id,
            error: `Ошибка обновления лида для сделки ${dealId}`,
          },
        );
      }

      return success;
    } catch (error) {
      this.logger.error(`Ошибка обновления лида для сделки ${dealId}:`, error);
      return false;
    }
  }

  /**
   * Конвертация лида в сделку в Bitrix24
   */
  async convertLeadToDeal(
    dealId: number,
  ): Promise<{ dealId?: number; contactId?: number } | null> {
    try {
      const deal = await this.dealRepository.findOneBy({ id: dealId });
      if (!deal || !deal.bitrix24_deal_id) {
        this.logger.error(
          `Сделка ${dealId} не найдена или не имеет привязанного лида в Bitrix24`,
        );
        return null;
      }

      const result = await this.bitrix24Service.convertLead(
        deal.bitrix24_deal_id,
      );

      if (result?.dealId) {
        await this.dealRepository.update(deal.id, {
          bitrix24_deal_id: result.dealId,
          bitrix24_synced_at: new Date(),
        });

        this.logger.log(result);
        if (result.contactId) {
          await this.userRepository.update(deal.creator_id, {
            bitrix24_contact_id: result.contactId,
            bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
            bitrix24_synced_at: new Date(),
          });
        } else {
          await this.userRepository.update(deal.creator_id, {
            bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
            bitrix24_synced_at: new Date(),
          });
        }

        this.logger.log(
          `Лид ${deal.bitrix24_deal_id} конвертирован в сделку ${result.dealId}`,
        );

        this.userActionsService.log(
          deal.creator_id,
          "bitrix24_lead_converted",
          {
            entity: "deals",
            params: {
              id: dealId,
            },
            deal_id: dealId,
            old_bitrix24_lead_id: deal.bitrix24_deal_id,
            new_bitrix24_deal_id: result.dealId,
            bitrix24_contact_id: result.contactId,
          },
        );
      } else {
        this.userActionsService.log(
          deal.creator_id,
          "bitrix24_lead_conversion_failed",
          {
            entity: "deals",
            params: {
              id: dealId,
            },
            deal_id: dealId,
            bitrix24_lead_id: deal.bitrix24_deal_id,
            error: "Failed to convert lead to deal",
          },
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Ошибка конвертации лида для сделки ${dealId}:`, error);

      const deal = await this.dealRepository.findOneBy({ id: dealId });
      if (deal) {
        this.userActionsService.log(
          deal.creator_id,
          "bitrix24_lead_conversion_error",
          {
            entity: "deals",
            params: {
              id: dealId,
            },
            deal_id: dealId,
            error:
              error.message || `Ошибка конвертации лида для сделки ${dealId}`,
          },
        );
      }

      return null;
    }
  }

  /**
   * Принудительная синхронизация всех несинхронизированных лидов
   */
  async forceResyncAllFailed(): Promise<{ success: number; failed: number }> {
    const result = { success: 0, failed: 0 };

    try {
      const failedDeals = await this.dealRepository.findBy({
        bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
        status: Not(DealStatus.Draft),
      });

      this.logger.log(
        `Начинаем принудительную синхронизацию ${failedDeals.length} проваленных лидов`,
      );

      for (const deal of failedDeals) {
        try {
          const success = await this.syncSingleLead(deal);
          if (success) {
            result.success++;
          } else {
            result.failed++;
          }
        } catch (error) {
          this.logger.error(
            `Ошибка при синхронизации лида для сделки ${deal.id}:`,
            error,
          );
          result.failed++;
        }
        await this.delay(500);
      }

      this.logger.log(
        `Принудительная синхронизация завершена. Успешно: ${result.success}, Неудачно: ${result.failed}`,
      );
    } catch (error) {
      this.logger.error("Ошибка при принудительной синхронизации:", error);
    }

    return result;
  }

  /**
   * Получение статистики синхронизации лидов
   */
  async getSyncStatistics(): Promise<any> {
    try {
      const totalDeals = await this.dealRepository.countBy({
        status: Not(DealStatus.Draft),
      });

      const syncedLeads = await this.dealRepository.countBy({
        bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
        status: Not(DealStatus.Draft),
      });

      const pendingLeads = await this.dealRepository.countBy({
        bitrix24_sync_status: Bitrix24SyncStatus.PENDING,
        status: Not(DealStatus.Draft),
      });

      const processingLeads = await this.dealRepository.countBy({
        bitrix24_sync_status: Bitrix24SyncStatus.PROCESSING,
        status: Not(DealStatus.Draft),
      });

      const failedLeads = await this.dealRepository.countBy({
        bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
        status: Not(DealStatus.Draft),
      });

      const convertedLeads = await this.dealRepository
        .createQueryBuilder("deal")
        .where("deal.bitrix24_deal_id IS NOT NULL")
        .andWhere("deal.bitrix24_deal_id IS NOT NULL")
        .getCount();

      const syncRate =
        totalDeals > 0 ? ((syncedLeads / totalDeals) * 100).toFixed(2) : "0";
      const conversionRate =
        syncedLeads > 0
          ? ((convertedLeads / syncedLeads) * 100).toFixed(2)
          : "0";

      return {
        total: totalDeals,
        synced: syncedLeads,
        pending: pendingLeads,
        processing: processingLeads,
        failed: failedLeads,
        converted: convertedLeads,
        syncRate: `${syncRate}%`,
        conversionRate: `${conversionRate}%`,
        lastSyncAttempt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Ошибка получения статистики синхронизации:", error);
      return null;
    }
  }

  /**
   * Очистка старых записей синхронизации (старше 30 дней)
   */
  async cleanupOldSyncData(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldFailedDeals = await this.dealRepository
        .createQueryBuilder("deal")
        .where("deal.bitrix24_sync_status = :status", {
          status: Bitrix24SyncStatus.FAILED,
        })
        .andWhere("deal.status != :draftStatus", {
          draftStatus: DealStatus.Draft,
        })
        .andWhere(
          "deal.bitrix24_synced_at < :date OR deal.bitrix24_synced_at IS NULL",
          { date: thirtyDaysAgo },
        )
        .getMany();

      let cleanedCount = 0;

      for (const deal of oldFailedDeals) {
        await this.dealRepository.update(deal.id, {
          bitrix24_sync_status: Bitrix24SyncStatus.PENDING,
          bitrix24_synced_at: null,
        });

        this.userActionsService.log(
          deal.creator_id,
          "bitrix24_sync_data_cleaned",
          {
            entity: "deals",
            params: {
              id: deal.id,
            },
            deal_id: deal.id,
            previous_status: Bitrix24SyncStatus.FAILED,
            new_status: Bitrix24SyncStatus.PENDING,
          },
        );

        cleanedCount++;
      }

      this.logger.log(
        `Очищено ${cleanedCount} старых записей синхронизации лидов`,
      );
      return cleanedCount;
    } catch (error) {
      this.logger.error(
        "Ошибка при очистке старых данных синхронизации:",
        error,
      );
      return 0;
    }
  }

  /**
   * Проверка существования лидов в Bitrix24
   */
  async validateBitrix24Leads(): Promise<{ valid: number; invalid: number }> {
    const result = { valid: 0, invalid: 0 };

    try {
      const syncedDeals = await this.dealRepository
        .createQueryBuilder("deal")
        .where("deal.bitrix24_sync_status = :status", {
          status: Bitrix24SyncStatus.SYNCED,
        })
        .andWhere("deal.status != :draftStatus", {
          draftStatus: DealStatus.Draft,
        })
        .andWhere("deal.bitrix24_deal_id IS NOT NULL")
        .getMany();

      this.logger.log(
        `Проверяем ${syncedDeals.length} синхронизированных лидов в Bitrix24`,
      );

      for (const deal of syncedDeals) {
        if (deal.bitrix24_deal_id) {
          const leadData = await this.bitrix24Service.getLead(
            deal.bitrix24_deal_id,
          );

          if (leadData) {
            result.valid++;
          } else {
            result.invalid++;
            this.logger.warn(
              `Лид ${deal.bitrix24_deal_id} не найден в Bitrix24`,
            );

            this.userActionsService.log(
              deal.creator_id,
              "bitrix24_lead_not_found",
              {
                entity: "deals",
                params: {
                  id: deal.id,
                },
                deal_id: deal.id,
                bitrix24_lead_id: deal.bitrix24_deal_id,
              },
            );
          }

          await this.delay(100);
        }
      }

      this.logger.log(
        `Проверка завершена. Валидных: ${result.valid}, Невалидных: ${result.invalid}`,
      );
    } catch (error) {
      this.logger.error("Ошибка при проверке лидов в Bitrix24:", error);
    }

    return result;
  }

  /**
   * Получение имени дистрибьютора (заглушка)
   * TODO: Реализовать получение имени дистрибьютора из соответствующего репозитория
   */
  private async getDistributorName(
    distributorId: number,
  ): Promise<string | undefined> {
    return `Distributor_${distributorId}`;
  }

  /**
   * Задержка выполнения
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
