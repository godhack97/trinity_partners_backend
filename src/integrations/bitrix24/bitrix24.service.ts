// src/integrations/bitrix24/bitrix24.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DealEntity, CustomerEntity, UserEntity, UserInfoEntity, CompanyEntity } from '@orm/entities';
import { CompanyRepository, CustomerRepository } from '@orm/repositories';

export interface Bitrix24LeadData {
  TITLE: string;
  NAME?: string;
  SECOND_NAME?: string;
  LAST_NAME?: string;
  COMPANY_TITLE?: string;
  STATUS_ID?: string;
  STATUS_DESCRIPTION?: string;
  OPPORTUNITY?: number;
  CURRENCY_ID?: string;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  OPENED?: 'Y' | 'N';
  ASSIGNED_BY_ID?: number;
  CREATED_BY_ID?: number;
  MODIFY_BY_ID?: number;
  // Контактные данные
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  EMAIL?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  WEB?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  ADDRESS?: string;
  COMMENTS?: string;
  // UTM метки
  UTM_SOURCE?: string;
  UTM_MEDIUM?: string;
  UTM_CAMPAIGN?: string;
  UTM_CONTENT?: string;
  UTM_TERM?: string;
  // Связанный контакт и компания
  CONTACT_ID?: number;
  COMPANY_ID?: number;
  // Пользовательские поля
  UF_CRM_1749553924?: number;  // ID сделки
  UF_CRM_1749553951?: string;  // Дата создания сделки
  UF_CRM_1749554019?: string;  // Дистрибьютор name
  UF_CRM_1747652899094?: string; // Компания партнера
  UF_CRM_1753262316548?: string; // пометка, что прилетело с партнерки
  [key: string]: any;
}

export const DealStatusRu = {
  registered: 'зарегистрирована',
  canceled: 'не зарегистрирована',
  moderation: "на рассмотрении",
  win: 'выиграна',
  loose: 'проиграла'
};

@Injectable()
export class Bitrix24Service {
  private readonly logger = new Logger(Bitrix24Service.name);
  private readonly webhookUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly companyRepository: CompanyRepository,
    private readonly customerRepository: CustomerRepository
  ) {
    this.webhookUrl = this.configService.get<string>('BITRIX24_WEBHOOK_URL');

    if (!this.webhookUrl) {
      this.logger.warn('BITRIX24_WEBHOOK_URL не настроен в конфигурации');
    }
  }

  /**
   * Форматирование даты для Bitrix24
   */
  private formatDateForBitrix(date: Date | any): string {
    if (!date) {
      return new Date().toISOString();
    }

    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toISOString();
    }

    if (date instanceof Date) {
      return date.toISOString();
    }

    return new Date(date).toISOString();
  }

  /**
   * HTTP-запрос с повторными попытками
   */
  private async httpRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Попытка ${attempt}/${maxRetries} неудачна:`, error.message);

        if (attempt < maxRetries) {
          await this.delay(delay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Создание контакта в Bitrix24
   */
  async createContact(userData: UserEntity & { info?: UserInfoEntity }): Promise<number | null> {
    if (!this.webhookUrl) {
      this.logger.warn('Bitrix24 webhook URL не настроен');
      return null;
    }

    console.log('userData', userData);

    try {
      const contactData = {
        NAME: userData?.info?.first_name || '',
        LAST_NAME: userData?.info?.last_name || '',
        COMPANY_TITLE: userData?.info?.company_name || userData?.owner_company?.name || '',
        PHONE: userData?.info?.phone ? [{ VALUE: userData?.info?.phone, VALUE_TYPE: 'WORK' }] : undefined,
        UF_CRM_68500D3603B21: (await this.companyRepository.findOne({ where: { owner_id: userData.id } }))?.inn || '',

        EMAIL: userData?.email ? [{ VALUE: userData?.email, VALUE_TYPE: 'WORK' }] : undefined,
        OPENED: 'Y',
        ASSIGNED_BY_ID: userData.id,
        CREATED_BY_ID: userData.id,
        COMMENTS: `Контакт создан автоматически для пользователя ID: ${userData.id}`,
      };

      Object.keys(contactData).forEach(key => {
        if (contactData[key] === undefined) {
          delete contactData[key];
        }
      });

      const response = await this.httpRequestWithRetry(() =>
        firstValueFrom(
          this.httpService.post(`${this.webhookUrl}/crm.contact.add.json`, {
            fields: contactData,
          })
        )
      );

      if (response.data?.result) {
        this.logger.log(`Контакт создан в Bitrix24 с ID: ${response.data.result}`);
        return response.data.result;
      }

      this.logger.error('Ошибка создания контакта в Bitrix24:', response.data);
      return null;
    } catch (error) {
      this.logger.error('Ошибка при создании контакта в Bitrix24:', error.message);
      return null;
    }
  }

  /**
   * Создание контакта заказчика в Bitrix24
   */
  async createCustomerContact(customerData: CustomerEntity): Promise<number | null> {
    if (!this.webhookUrl) {
      this.logger.warn('Bitrix24 webhook URL не настроен');
      return null;
    }

    try {
      const contactData = {
        NAME: customerData.first_name || '',
        LAST_NAME: customerData.last_name || '',
        COMPANY_TITLE: customerData.company_name || '',
        PHONE: customerData.phone ? [{ VALUE: customerData.phone, VALUE_TYPE: 'WORK' }] : undefined,
        EMAIL: customerData.email ? [{ VALUE: customerData.email, VALUE_TYPE: 'WORK' }] : undefined,
        OPENED: 'Y',
        COMMENTS: `Контакт заказчика. ИНН: ${customerData.inn || 'не указан'}`,
        UF_CRM_CUSTOMER_INN: customerData.inn, // Пользовательское поле для ИНН
      };

      Object.keys(contactData).forEach(key => {
        if (contactData[key] === undefined) {
          delete contactData[key];
        }
      });

      const response = await this.httpRequestWithRetry(() =>
        firstValueFrom(
          this.httpService.post(`${this.webhookUrl}/crm.contact.add.json`, {
            fields: contactData,
          })
        )
      );

      if (response.data?.result) {
        this.logger.log(`Контакт заказчика создан в Bitrix24 с ID: ${response.data.result}`);
        return response.data.result;
      }

      this.logger.error('Ошибка создания контакта заказчика в Bitrix24:', response.data);
      return null;
    } catch (error) {
      this.logger.error('Ошибка при создании контакта заказчика в Bitrix24:', error.message);
      return null;
    }
  }

/**
 * Создание компании заказчика в Bitrix24
 */
async createCustomerCompany(customerData: CustomerEntity): Promise<number | null> {
  if (!this.webhookUrl) {
    this.logger.warn('Bitrix24 webhook URL не настроен');
    return null;
  }

  if (customerData?.bitrix24_company_id) {
    this.logger.log(`Компания с id ${customerData?.bitrix24_company_id} уже существует в Bitrix24`)
    return customerData?.bitrix24_company_id;
  }

  try {
    const companyData = {
      TITLE: customerData?.company_name || `${customerData?.first_name} ${customerData?.last_name}`.trim(),
      COMPANY_TYPE: 'CUSTOMER',
      PHONE: customerData?.phone ? [{ VALUE: customerData?.phone, VALUE_TYPE: 'WORK' }] : undefined,
      EMAIL: customerData?.email ? [{ VALUE: customerData?.email, VALUE_TYPE: 'WORK' }] : undefined,
      OPENED: 'Y',
      COMMENTS: `Компания заказчика. ИНН: ${customerData?.inn || 'не указан'}`,
      UF_CRM_68500D3655754: customerData?.first_name,
      UF_CRM_68500D365A5DC: customerData?.last_name,
      UF_CRM_68500D3660B6A: customerData?.inn,
    };

    Object.keys(companyData).forEach(key => {
      if (companyData[key] === undefined) {
        delete companyData[key];
      }
    });

    const response = await this.httpRequestWithRetry(() =>
      firstValueFrom(
        this.httpService.post(`${this.webhookUrl}/crm.company.add.json`, {
          fields: companyData,
        })
      )
    );

    if (response.data?.result) {
      const bitrixCompanyId = response.data.result;
      this.logger.log(`Компания заказчика создана в Bitrix24 с ID: ${bitrixCompanyId}`);

      // ДОБАВЛЕННЫЕ ЛОГИ ПЕРЕД ОБНОВЛЕНИЕМ
      console.log('About to update customer with ID:', customerData.id);
      console.log('Setting bitrix24_company_id to:', bitrixCompanyId);

      try {
        const updateResult = await this.customerRepository.update(customerData.id, {
          bitrix24_company_id: bitrixCompanyId
        });

        console.log('Update result:', updateResult);

        const updatedCustomer = await this.customerRepository.findOne({
          where: { id: customerData.id }
        });

        console.log('Updated customer from DB:', {
          id: updatedCustomer?.id,
          bitrix24_company_id: updatedCustomer?.bitrix24_company_id
        });

        if (!updatedCustomer?.bitrix24_company_id) {
          this.logger.error('КРИТИЧЕСКАЯ ОШИБКА: bitrix24_company_id не сохранился в БД!');
        }

      } catch (updateError) {
        this.logger.error('Ошибка при обновлении customer в БД:', updateError);
        console.log('Update error details:', updateError);
      }

      console.log('=== END CREATE CUSTOMER COMPANY DEBUG ===');
      return bitrixCompanyId;
    }

    this.logger.error('Ошибка создания компании заказчика в Bitrix24:', response.data);
    return null;
  } catch (error) {
    this.logger.error('Ошибка при создании компании заказчика в Bitrix24:', error.message);
    console.log('Full error:', error);
    return null;
  }
}

  async createLead(dealData: DealEntity, customer: any, distributorName?: string, creatorContactId?: number): Promise<number | null> {
    if (!this.webhookUrl) {
      this.logger.warn('Bitrix24 webhook URL не настроен');
      return null;
    }

    try {
      const creatorInfo = dealData.partner?.info;
      const creatorUser = dealData.partner;

      const leadTitle = `Лид по сделке "${dealData.title ?? dealData.deal_num}"`;
      const contactId = creatorContactId || creatorUser?.bitrix24_contact_id || (await this.createContact(dealData.partner));

      if (!contactId) {
        this.logger.error('Не удалось создать контакт для лида');
        return null;
      }

      let companyId: number | null = null;
      if (dealData.customer ?? customer) {
        const customerToUse = dealData.customer ?? customer;

        companyId = customerToUse?.bitrix24_company_id || (await this.createCustomerCompany(customerToUse));

        console.log('Final companyId after createCustomerCompany:', companyId);

        if (!companyId) {
          this.logger.error('Не удалось создать компанию заказчика для лида');
          return null;
        }
      }

      const bitrixLeadData: Bitrix24LeadData = {
        TITLE: leadTitle,

        NAME: creatorInfo?.first_name || '',
        LAST_NAME: creatorInfo?.last_name || '',
        COMPANY_TITLE: creatorInfo?.company_name || dealData.partner?.owner_company?.name || '',
        UF_CRM_1747652899094: creatorInfo?.company_name || dealData.partner?.owner_company?.name || '',
        PHONE: creatorInfo?.phone ? [{ VALUE: creatorInfo.phone, VALUE_TYPE: 'WORK' }] : undefined,
        EMAIL: creatorUser?.email ? [{ VALUE: creatorUser.email, VALUE_TYPE: 'WORK' }] : undefined,

        STATUS_ID: 'NEW', // Всегда новый статус
        OPPORTUNITY: dealData.deal_sum || 0,
        CURRENCY_ID: 'RUB',
        SOURCE_ID: 'SELF',
        SOURCE_DESCRIPTION: 'Создано через внутреннюю систему',
        OPENED: 'Y',
        ASSIGNED_BY_ID: dealData.creator_id,
        CREATED_BY_ID: dealData.creator_id,

        CONTACT_ID: creatorUser?.bitrix24_contact_id ?? creatorContactId,
        COMPANY_ID: companyId,
        COMMENTS: this.formatLeadComments(dealData),

        // Пользовательские поля
        UF_CRM_1749553924: dealData.id,
        UF_CRM_1749553951: dealData.created_at ? this.formatDateForBitrix(dealData.created_at) : this.formatDateForBitrix(new Date()),
        UF_CRM_1749554019: distributorName,
        UF_CRM_1753262316548: 'Создано в партнёрском конфигураторе',
      };

      Object.keys(bitrixLeadData).forEach(key => {
        if (bitrixLeadData[key] === undefined) {
          delete bitrixLeadData[key];
        }
      });

      const response = await this.httpRequestWithRetry(() =>
        firstValueFrom(
          this.httpService.post(`${this.webhookUrl}/crm.lead.add.json`, {
            fields: bitrixLeadData,
          })
        )
      );

      if (response.data?.result) {
        this.logger.log(`Лид создан в Bitrix24 с ID: ${response.data.result}`);

        return response.data.result;
      }

      this.logger.error('Ошибка создания лида в Bitrix24:', response.data);
      return null;
    } catch (error) {
      this.logger.error('Ошибка при создании лида в Bitrix24:', error.message);
      return null;
    }
  }

  /**
   * Форматирование комментариев для лида с информацией о заказчике
   */
  private formatLeadComments(dealData: Partial<DealEntity>): string {
    const customerData = dealData.customer;
    const creatorData = dealData.partner;
    const comments = [];

    comments.push('=== ИНФОРМАЦИЯ О ПАРТНЕРЕ (СОЗДАТЕЛЬ СДЕЛКИ) ===');
    if (creatorData?.info) {
      comments.push(`Имя: ${creatorData.info.first_name} ${creatorData.info.last_name}`);
      if (creatorData.info.company_name) {
        comments.push(`Компания: ${creatorData.info.company_name}`);
      }
      if (creatorData.info.phone) {
        comments.push(`Телефон: ${creatorData.info.phone}`);
      }
    }
    if (creatorData?.email) {
      comments.push(`Email: ${creatorData.email}`);
    }

    if (customerData) {
      comments.push('');
      comments.push('=== ИНФОРМАЦИЯ О ЗАКАЗЧИКЕ ===');
      comments.push(`Имя: ${customerData.first_name} ${customerData.last_name}`);
      if (customerData.company_name) {
        comments.push(`Компания: ${customerData.company_name}`);
      }
      if (customerData.inn) {
        comments.push(`ИНН: ${customerData.inn}`);
      }
      if (customerData.email) {
        comments.push(`Email: ${customerData.email}`);
      }
      if (customerData.phone) {
        comments.push(`Телефон: ${customerData.phone}`);
      }
    }

    comments.push('');
    comments.push('=== ИНФОРМАЦИЯ О СДЕЛКЕ ===');
    comments.push(`Номер сделки: ${dealData.deal_num}`);
    if (dealData.title) {
      comments.push(`Название: ${dealData.title}`);
    }
    comments.push(`Сумма: ${dealData.deal_sum} руб.`);
    if (dealData.purchase_date) {
      comments.push(`Дата закупки: ${dealData.purchase_date.toLocaleDateString('ru-RU')}`);
    }
    if (dealData.status) {
      comments.push(`Статус: ${DealStatusRu[dealData.status]}`);
    }

    if (dealData.competition_link) {
      comments.push(`Ссылка на конкурс: ${dealData.competition_link}`);
    }
    if (dealData.configuration_link) {
      comments.push(`Ссылка на конфигурацию: ${dealData.configuration_link}`);
    }
    if (dealData.comment) {
      comments.push(`Комментарий: ${dealData.comment}`);
    }

    if (dealData.special_discount) {
      comments.push(`Специальная скидка: ${dealData.special_discount}`);
    }
    if (dealData.special_price) {
      comments.push(`Специальная цена: ${dealData.special_price} руб.`);
    }

    if (dealData.discount_date) {
      comments.push(`Дата скидки: ${dealData.discount_date.toLocaleDateString('ru-RU')}`);
    }

    return comments.join('\n');
  }

  /**
   * Обновление лида в Bitrix24
   */
  async updateLead(bitrixLeadId: number, dealData: Partial<DealEntity>, distributorName?: string, creatorContactId?: number, creatorData?: Partial<UserEntity & { info?: Partial<UserInfoEntity> }>): Promise<boolean> {
    if (!this.webhookUrl) {
      this.logger.warn('Bitrix24 webhook URL не настроен');
      return false;
    }

    try {
      const updateData: Partial<Bitrix24LeadData> = {};

      if (dealData.deal_sum !== undefined) {
        updateData.OPPORTUNITY = dealData.deal_sum;
      }

      if (dealData.title) {
        updateData.TITLE = `Лид по сделке "${dealData.title}"`;
      }

      if (creatorData?.info?.first_name) {
        updateData.NAME = creatorData.info.first_name;
      }

      if (creatorData?.info?.last_name) {
        updateData.LAST_NAME = creatorData.info.last_name;
      }

      if (creatorData?.info?.company_name) {
        updateData.COMPANY_TITLE = creatorData.info.company_name;
        updateData.UF_CRM_1747652899094 = creatorData.info.company_name;
      }

      if (creatorData?.info?.phone) {
        updateData.PHONE = [{ VALUE: creatorData.info.phone, VALUE_TYPE: 'WORK' }];
      }

      if (creatorData?.email) {
        updateData.EMAIL = [{ VALUE: creatorData.email, VALUE_TYPE: 'WORK' }];
      }

      if (distributorName) {
        updateData.UF_CRM_1749554019 = distributorName;
      }

      if (dealData.comment || dealData.purchase_date || dealData.customer) {
        updateData.COMMENTS = this.formatLeadComments(dealData);
      }

      const response = await this.httpRequestWithRetry(() =>
        firstValueFrom(
          this.httpService.post(`${this.webhookUrl}/crm.lead.update.json`, {
            id: bitrixLeadId,
            fields: updateData,
          })
        )
      );

      if (response.data?.result) {
        this.logger.log(`Лид обновлен в Bitrix24 ID: ${bitrixLeadId}`);
        return true;
      }

      this.logger.error('Ошибка обновления лида в Bitrix24:', response.data);
      return false;
    } catch (error) {
      this.logger.error('Ошибка при обновлении лида в Bitrix24:', error.message);
      return false;
    }
  }

  /**
   * Получение лида из Bitrix24
   */
  async getLead(bitrixLeadId: number): Promise<any | null> {
    if (!this.webhookUrl) {
      this.logger.warn('Bitrix24 webhook URL не настроен');
      return null;
    }

    try {
      const response = await this.httpRequestWithRetry(() =>
        firstValueFrom(
          this.httpService.post(`${this.webhookUrl}/crm.lead.get.json`, {
            id: bitrixLeadId,
          })
        )
      );

      if (response.data?.result) {
        return response.data.result;
      }

      return null;
    } catch (error) {
      this.logger.error('Ошибка при получении лида из Bitrix24:', error.message);
      return null;
    }
  }

  /**
   * Конвертация лида в сделку
   */
  async convertLead(bitrixLeadId: number): Promise<{ dealId?: number; contactId?: number; companyId?: number } | null> {
    if (!this.webhookUrl) {
      this.logger.warn('Bitrix24 webhook URL не настроен');
      return null;
    }

    try {
      const response = await this.httpRequestWithRetry(() =>
        firstValueFrom(
          this.httpService.post(`${this.webhookUrl}/crm.lead.convert.json`, {
            id: bitrixLeadId,
            fields: {
              DEAL: 'Y',
              CONTACT: 'Y',
              COMPANY: 'N',
            },
          })
        )
      );

      if (response.data?.result) {
        this.logger.log(`Лид конвертирован в Bitrix24 ID: ${bitrixLeadId}`);
        return {
          dealId: response.data.result.DEAL_ID,
          contactId: response.data.result.CONTACT_ID,
          companyId: response.data.result.COMPANY_ID,
        };
      }

      this.logger.error('Ошибка конвертации лида в Bitrix24:', response.data);
      return null;
    } catch (error) {
      this.logger.error('Ошибка при конвертации лида в Bitrix24:', error.message);
      return null;
    }
  }

  /**
   * Проверка доступности Bitrix24
   */
  async checkConnection(): Promise<boolean> {
    if (!this.webhookUrl) {
      return false;
    }

    try {
      const response = await this.httpRequestWithRetry(() =>
        firstValueFrom(
          this.httpService.post(`${this.webhookUrl}/profile.json`)
        )
      );
      return response.data?.result !== undefined;
    } catch (error) {
      this.logger.error('Ошибка подключения к Bitrix24:', error.message);
      return false;
    }
  }

  /**
   * Задержка выполнения
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}