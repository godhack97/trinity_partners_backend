import { Controller, Get, Post, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Bitrix24QueueService } from './bitrix24-queue.service';
import { Bitrix24Service } from './bitrix24.service';

@ApiTags('bitrix24-admin')
@ApiBearerAuth()
@Controller('admin/bitrix24')
export class Bitrix24AdminController {
  constructor(
    private readonly bitrix24QueueService: Bitrix24QueueService,
    private readonly bitrix24Service: Bitrix24Service,
  ) {}

  @Get('connection/test')
  @ApiOperation({ summary: 'Проверка подключения к Bitrix24' })
  @ApiResponse({
    status: 200,
    description: 'Результат проверки подключения',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async testConnection() {
    const isConnected = await this.bitrix24Service.checkConnection();

    return {
      connected: isConnected,
      message: isConnected
        ? 'Подключение к Bitrix24 работает корректно'
        : 'Ошибка подключения к Bitrix24. Проверьте настройки BITRIX24_WEBHOOK_URL'
    };
  }

  @Get('sync/statistics')
  @ApiOperation({ summary: 'Получение статистики синхронизации лидов' })
  @ApiResponse({
    status: 200,
    description: 'Статистика синхронизации лидов с Bitrix24'
  })
  async getSyncStatistics() {
    return this.bitrix24QueueService.getSyncStatistics();
  }

  @Post('sync/force-all')
  @ApiOperation({ summary: 'Принудительная синхронизация всех проваленных лидов' })
  @ApiResponse({
    status: 200,
    description: 'Результат принудительной синхронизации',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number' },
        failed: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async forceResyncAll() {
    const result = await this.bitrix24QueueService.forceResyncAllFailed();

    return {
      ...result,
      message: `Синхронизация лидов завершена. Успешно: ${result.success}, Неудачно: ${result.failed}`
    };
  }

  @Post('sync/lead/:id')
  @ApiOperation({ summary: 'Принудительная синхронизация конкретного лида' })
  @ApiParam({ name: 'id', description: 'ID сделки для синхронизации', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Результат синхронизации лида'
  })
  async forceSyncLead(@Param('id', ParseIntPipe) dealId: number) {
    const success = await this.bitrix24QueueService.forceSyncLead(dealId);

    return {
      success,
      dealId,
      message: success
        ? `Лид для сделки ${dealId} успешно синхронизирован`
        : `Ошибка синхронизации лида для сделки ${dealId}`
    };
  }

  @Post('lead/convert/:id')
  @ApiOperation({ summary: 'Конвертация лида в сделку в Bitrix24' })
  @ApiParam({ name: 'id', description: 'ID сделки для конвертации лида', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Результат конвертации лида в сделку',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        originalDealId: { type: 'number' },
        bitrix24DealId: { type: 'number' },
        contactId: { type: 'number' },
        message: { type: 'string' }
      }
    }
  })
  async convertLeadToDeal(@Param('id', ParseIntPipe) dealId: number) {
    const result = await this.bitrix24QueueService.convertLeadToDeal(dealId);

    if (result?.dealId) {
      return {
        success: true,
        originalDealId: dealId,
        bitrix24DealId: result.dealId,
        contactId: result.contactId,
        message: `Лид для сделки ${dealId} успешно конвертирован в сделку Bitrix24 с ID ${result.dealId}`
      };
    }

    return {
      success: false,
      originalDealId: dealId,
      message: `Ошибка конвертации лида для сделки ${dealId}`
    };
  }

  @Post('lead/update/:id')
  @ApiOperation({ summary: 'Обновление лида в Bitrix24' })
  @ApiParam({ name: 'id', description: 'ID сделки для обновления лида', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Результат обновления лида'
  })
  async updateLead(@Param('id', ParseIntPipe) dealId: number) {
    const success = await this.bitrix24QueueService.updateLead(dealId);

    return {
      success,
      dealId,
      message: success
        ? `Лид для сделки ${dealId} успешно обновлен`
        : `Ошибка обновления лида для сделки ${dealId}`
    };
  }

  @Get('lead/:id')
  @ApiOperation({ summary: 'Получение лида из Bitrix24 по ID лида в Bitrix24' })
  @ApiParam({ name: 'id', description: 'ID лида в Bitrix24', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Данные лида из Bitrix24'
  })
  async getLead(@Param('id', ParseIntPipe) leadId: number) {
    const leadData = await this.bitrix24Service.getLead(leadId);

    if (leadData) {
      return {
        success: true,
        leadId,
        lead: leadData,
        message: `Лид ${leadId} найден в Bitrix24`
      };
    }

    return {
      success: false,
      leadId,
      message: `Лид ${leadId} не найден в Bitrix24`
    };
  }

  @Post('sync/cleanup')
  @ApiOperation({ summary: 'Очистка старых записей синхронизации лидов (старше 30 дней)' })
  @ApiResponse({
    status: 200,
    description: 'Количество очищенных записей'
  })
  async cleanupOldSyncData() {
    const cleanedCount = await this.bitrix24QueueService.cleanupOldSyncData();

    return {
      cleaned: cleanedCount,
      message: `Очищено ${cleanedCount} старых записей синхронизации лидов`
    };
  }

  @Get('sync/validate-leads')
  @ApiOperation({ summary: 'Проверка существования синхронизированных лидов в Bitrix24' })
  @ApiResponse({
    status: 200,
    description: 'Результат проверки лидов'
  })
  async validateLeads() {
    const result = await this.bitrix24QueueService.validateBitrix24Leads();

    return {
      ...result,
      message: `Проверка лидов завершена. Валидных: ${result.valid}, Невалидных: ${result.invalid}`
    };
  }

  @Post('sync/run-now')
  @ApiOperation({ summary: 'Запуск синхронизации неотправленных лидов прямо сейчас' })
  @ApiResponse({
    status: 200,
    description: 'Синхронизация лидов запущена'
  })
  async runSyncNow() {
    // Запускаем синхронизацию в фоне
    this.bitrix24QueueService.syncPendingLeads().catch(error => {
      console.error('Ошибка при ручном запуске синхронизации лидов:', error);
    });

    return {
      message: 'Синхронизация неотправленных лидов запущена в фоне. Проверьте логи для получения результатов.',
      timestamp: new Date().toISOString()
    };
  }

  @Get('sync/leads/statistics/detailed')
  @ApiOperation({ summary: 'Детальная статистика синхронизации и конвертации лидов' })
  @ApiResponse({
    status: 200,
    description: 'Детальная статистика синхронизации и конвертации лидов'
  })
  async getDetailedLeadStatistics() {
    const stats = await this.bitrix24QueueService.getSyncStatistics();

    return {
      ...stats,
      description: {
        total: 'Общее количество сделок в системе',
        synced: 'Количество синхронизированных лидов',
        pending: 'Лиды ожидающие синхронизации',
        failed: 'Лиды с ошибками синхронизации',
        converted: 'Количество конвертированных лидов в сделки',
        syncRate: 'Процент успешной синхронизации от общего количества',
        conversionRate: 'Процент конвертации лидов в сделки от синхронизированных'
      }
    };
  }

  @Post('leads/bulk-convert')
  @ApiOperation({ summary: 'Массовая конвертация синхронизированных лидов в сделки' })
  @ApiResponse({
    status: 200,
    description: 'Информация о массовой конвертации'
  })
  async bulkConvertLeads() {
    return {
      message: 'Массовая конвертация не реализована в текущей версии.',
      suggestion: 'Используйте POST /admin/bitrix24/lead/convert/:id для конвертации отдельных лидов',
      alternative: 'Для массовой конвертации обратитесь к разработчику для добавления этой функции'
    };
  }
}