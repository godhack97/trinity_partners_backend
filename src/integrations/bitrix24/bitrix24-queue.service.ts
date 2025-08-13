// src/integrations/bitrix24/bitrix24-queue.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Bitrix24Service } from "./bitrix24.service";
import {
  DealRepository,
  UserRepository,
  CustomerRepository,
} from "@orm/repositories";
import { Bitrix24SyncStatus } from "@orm/entities";
import { IsNull, Not } from "typeorm";
import { UserActionsService } from "../../logs/user-actions.service";

@Injectable()
export class Bitrix24QueueService {
  private readonly logger = new Logger(Bitrix24QueueService.name);

  constructor(
    private readonly bitrix24Service: Bitrix24Service,
    private readonly dealRepository: DealRepository,
    private readonly userRepository: UserRepository,
    private readonly customerRepository: CustomerRepository,
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
      const pendingDeals = await this.dealRepository.findBy({
        bitrix24_sync_status: Bitrix24SyncStatus.PENDING,
      });

      const failedDeals = await this.dealRepository.findBy({
        bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
      });

      const nullDeals = await this.dealRepository.findBy({
        bitrix24_sync_status: IsNull(),
      });

      const allDealsToSync = [...pendingDeals, ...failedDeals, ...nullDeals];

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
  private async syncSingleLead(deal: any): Promise<void> {
    try {
      this.logger.log(`Синхронизируем лид для сделки ID: ${deal.id}`);

      const user = await this.userRepository.findOneBy({ id: deal.creator_id });
      if (!user) {
        this.logger.error(`Пользователь не найден для сделки ${deal.id}`);

        this.userActionsService.log(0, "bitrix24_contact_notfound", {
          entity: "deals",
          params: {
            id: deal.id,
          },
          bitrix24_contact_id: deal.creator_id,
          deal_id: deal.id,
          id: deal.id,
        });

        return;
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
      if (deal.distributor_id) {
        distributorName = `Distributor_${deal.distributor_id}`;
      }

      const existingCustomer = await this.customerRepository.findSimilar(
        deal.customer.inn,
        deal.customer.email,
        deal.customer.first_name,
        deal.customer.last_name,
      );

      const customer =
        existingCustomer || (await this.customerRepository.save(deal.customer));

      const bitrixLeadId = await this.bitrix24Service.createLead(
        deal,
        customer,
        distributorName,
        contactId,
      );

      if (bitrixLeadId) {
        await this.dealRepository.update(deal.id, {
          bitrix24_deal_id: bitrixLeadId,
          bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
          bitrix24_synced_at: new Date(),
        });

        this.logger.log(
          `Лид для сделки ${deal.id} успешно создан в Bitrix24 с ID: ${bitrixLeadId}`,
        );
      } else {
        await this.dealRepository.update(deal.id, {
          bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
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
      }
    } catch (error) {
      this.logger.error(
        `Ошибка синхронизации лида для сделки ${deal.id}:`,
        error,
      );

      await this.dealRepository.update(deal.id, {
        bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
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

      await this.syncSingleLead(deal);
      return true;
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
      });

      this.logger.log(
        `Начинаем принудительную синхронизацию ${failedDeals.length} проваленных лидов`,
      );

      for (const deal of failedDeals) {
        try {
          await this.syncSingleLead(deal);
          result.success++;
          await this.delay(500);
        } catch (error) {
          this.logger.error(
            `Ошибка при синхронизации лида для сделки ${deal.id}:`,
            error,
          );
          result.failed++;
        }
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
      const totalDeals = await this.dealRepository.count();

      const syncedLeads = await this.dealRepository.countBy({
        bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
      });

      const pendingLeads = await this.dealRepository.countBy({
        bitrix24_sync_status: Bitrix24SyncStatus.PENDING,
      });

      const failedLeads = await this.dealRepository.countBy({
        bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
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
