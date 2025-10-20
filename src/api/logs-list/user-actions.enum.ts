export enum UserActionType {
  CONFIGURATOR_COMPONENT_ADD = "configurator_component_add",
  CONFIGURATOR_COMPONENT_UPDATE = "configurator_component_update",
  CONFIGURATOR_COMPONENT_DELETE = "configurator_component_delete",

  CONFIGURATOR_COMPONENT_EXPORT = "configurator_component_export",
  CONFIGURATOR_COMPONENT_IMPORT = "configurator_component_import",
  CONFIGURATOR_COMPONENT_BACKUP = "configurator_component_backup",
  CONFIGURATOR_COMPONENT_RESTORE_BACKUP = "configurator_component_restore_backup",
  CONFIGURATOR_COMPONENT_BACKUP_DELETE = "configurator_component_backup_delete",

  CONFIGURATOR_MULTISLOT_ADD = "configurator_multislot_add",
  CONFIGURATOR_MULTISLOT_UPDATE = "configurator_multislot_update",
  CONFIGURATOR_MULTISLOT_DELETE = "configurator_multislot_delete",

  CONFIGURATOR_PROCESSORGENERATION_ADD = "configurator_processorGeneration_add",
  CONFIGURATOR_PROCESSORGENERATION_UPDATE = "configurator_processorGeneration_update",
  CONFIGURATOR_PROCESSORGENERATION_DELETE = "configurator_processorGeneration_delete",

  CONFIGURATOR_SERVER_ADD = "configurator_server_add",
  CONFIGURATOR_SERVER_UPDATE = "configurator_server_update",
  CONFIGURATOR_SERVER_DELETE = "configurator_server_delete",

  CONFIGURATOR_SERVERGENERATION_ADD = "configurator_serverGeneration_add",
  CONFIGURATOR_SERVERGENERATION_UPDATE = "configurator_serverGeneration_update",
  CONFIGURATOR_SERVERGENERATION_DELETE = "configurator_serverGeneration_delete",

  CONFIGURATOR_SERVERHEIGHT_ADD = "configurator_serverHeight_add",
  CONFIGURATOR_SERVERHEIGHT_UPDATE = "configurator_serverHeight_update",
  CONFIGURATOR_SERVERHEIGHT_DELETE = "configurator_serverHeight_delete",

  CONFIGURATOR_SLOT_ADD = "configurator_slot_add",
  CONFIGURATOR_SLOT_UPDATE = "configurator_slot_update",
  CONFIGURATOR_SLOT_DELETE = "configurator_slot_delete",

  DEAL_UPDATE = "deal_update",
  DEAL_ADD = "deal_add",
  DEAL_DELETE = "deal_delete",

  DISTRIBUTOR_ADD = "distributor_add",
  DISTRIBUTOR_UPDATE = "distributor_update",
  DISTRIBUTOR_DELETE = "distributor_delete",

  PARTNER_ACCEPT = "partner_accept",
  PARTNER_REJECT = "partner_reject",
  PARTNER_EDIT_MANAGER = "partner_edit_manager",

  CREATE_USER = "create_user",
  UPDATE_USER = "update_user",
  ARCHIVE_USER = "archive_user",
  RESTORE_USER = "restore_user",
  USER_ARCHIVE = "user_archive",

  AUTH_UPDATE_PASSWORD = "auth_update_password",
  AUTH_RECOVERY_PASSWORD = "auth_recovery_password",

  EMPLOYEE_ADD = "employee_add",
  EMPLOYEE_ARCHIVE = "employee_archive",

  NEWS_ADD = "news_add",
  NEWS_UPDATE = "news_update",
  NEWS_DELETE = "news_delete",

  PROFILE_UPDATE = "profile_update",
  PROFILE_UPDATE_SETTINGS = "profile_update_settings",
  PROFILE_UPDATE_EMAIL = "profile_update_email",
  PROFILE_UPDATE_PASSWORD = "profile_update_password",

  REGISTRATION_EMPLOYEE = "registration_employee",
  REGISTRATION_PARTNER = "registration_partner",
  REGISTRATION_SUPERADMIN = "registration_superAdmin",

  BITRIX24_CONTACT_NOTFOUND = "bitrix24_contact_notfound",
  BITRIX24_CONTACT_CREATED = "bitrix24_contact_created",
  BITRIX24_CONTACT_CREATION_FAILED = "bitrix24_contact_creation_failed",
  BITRIX24_LEAD_SYNC_FAILED = "bitrix24_lead_sync_failed",
  BITRIX24_LEAD_SYNC_ERROR = "bitrix24_lead_sync_error",
  BITRIX24_FORCE_SYNC_STARTED = "bitrix24_force_sync_started",
  BITRIX24_LEAD_UPDATED = "bitrix24_lead_updated",
  BITRIX24_LEAD_UPDATE_FAILED = "bitrix24_lead_update_failed",
  BITRIX24_LEAD_CONVERTED = "bitrix24_lead_converted",
  BITRIX24_LEAD_CONVERSION_FAILED = "bitrix24_lead_conversion_failed",
  BITRIX24_LEAD_CONVERSION_ERROR = "bitrix24_lead_conversion_error",
  BITRIX24_SYNC_DATA_CLEANED = "bitrix24_sync_data_cleaned",
  BITRIX24_LEAD_NOT_FOUND = "bitrix24_lead_not_found",
}

export const UserActionLabels: Record<UserActionType, string> = {

 [UserActionType.CONFIGURATOR_COMPONENT_EXPORT] : "Экспорт компонент",
 [UserActionType.CONFIGURATOR_COMPONENT_IMPORT] : "Импорт компонент",
 [UserActionType.CONFIGURATOR_COMPONENT_BACKUP] : "Создан бекап компонент",
 [UserActionType.CONFIGURATOR_COMPONENT_RESTORE_BACKUP] : "Восстановлен бекап компонент",
 [UserActionType.CONFIGURATOR_COMPONENT_BACKUP_DELETE] : "Удалён бекап компонент",


  [UserActionType.BITRIX24_CONTACT_NOTFOUND]: "Контакт не найден для сделки",
  [UserActionType.BITRIX24_CONTACT_CREATED]: "Контакт создан в Bitrix24",
  [UserActionType.BITRIX24_CONTACT_CREATION_FAILED]:
    "Ошибка создания контакта в Bitrix24",
  [UserActionType.BITRIX24_LEAD_SYNC_FAILED]:
    "Не удалось создать сделку в Bitrix24",
  [UserActionType.BITRIX24_LEAD_SYNC_ERROR]:
    "Ошибка синхронизации сделки в Bitrix24",
  [UserActionType.BITRIX24_FORCE_SYNC_STARTED]:
    "Ошибка принудительной синхронизации лида для сделки",
  [UserActionType.BITRIX24_LEAD_UPDATED]: "Сделка успешно обновлена",
  [UserActionType.BITRIX24_LEAD_UPDATE_FAILED]:
    "Ошибка обновления лида для сделки",
  [UserActionType.BITRIX24_LEAD_CONVERTED]: "Лид конвертирован в сделку",
  [UserActionType.BITRIX24_LEAD_CONVERSION_FAILED]:
    "Не удалось конвертировать лид в сделку",
  [UserActionType.BITRIX24_LEAD_CONVERSION_ERROR]:
    "Ошибка конвертации лида для сделки",
  [UserActionType.BITRIX24_SYNC_DATA_CLEANED]:
    "Очищены старые записи по сделкам failed -> pending",
  [UserActionType.BITRIX24_LEAD_NOT_FOUND]: "Лид не найден в Bitrix24",

  [UserActionType.CONFIGURATOR_COMPONENT_ADD]:
    "Добавлен компонент конфигуратора",
  [UserActionType.CONFIGURATOR_COMPONENT_UPDATE]:
    "Обновлён компонент конфигуратора",
  [UserActionType.CONFIGURATOR_COMPONENT_DELETE]:
    "Удалён компонент конфигуратора",

  [UserActionType.CONFIGURATOR_MULTISLOT_ADD]: "Добавлен слот конфигуратора",
  [UserActionType.CONFIGURATOR_MULTISLOT_UPDATE]: "Обновлён слот конфигуратора",
  [UserActionType.CONFIGURATOR_MULTISLOT_DELETE]: "Удалён слот конфигуратора",

  [UserActionType.CONFIGURATOR_PROCESSORGENERATION_ADD]:
    "Добавлено поколение процессоров",
  [UserActionType.CONFIGURATOR_PROCESSORGENERATION_UPDATE]:
    "Обновлёно поколение процессоров",
  [UserActionType.CONFIGURATOR_PROCESSORGENERATION_DELETE]:
    "Удалёно поколение процессоров",

  [UserActionType.CONFIGURATOR_SERVER_ADD]: "Добавлен сервер",
  [UserActionType.CONFIGURATOR_SERVER_UPDATE]: "Обновлён сервер",
  [UserActionType.CONFIGURATOR_SERVER_DELETE]: "Удалён сервер",

  [UserActionType.CONFIGURATOR_SERVERGENERATION_ADD]:
    "Добавлено поколение серверов ",
  [UserActionType.CONFIGURATOR_SERVERGENERATION_UPDATE]:
    "Обновлёно поколение серверов",
  [UserActionType.CONFIGURATOR_SERVERGENERATION_DELETE]:
    "Удалёно поколение серверов",

  [UserActionType.CONFIGURATOR_SERVERHEIGHT_ADD]: "Добавлена высота сервера",
  [UserActionType.CONFIGURATOR_SERVERHEIGHT_UPDATE]: "Обновлена высота сервера",
  [UserActionType.CONFIGURATOR_SERVERHEIGHT_DELETE]: "Удалена высота сервера",

  [UserActionType.CONFIGURATOR_SLOT_ADD]: "Добавлен слот серверов",
  [UserActionType.CONFIGURATOR_SLOT_UPDATE]: "Обновлён слот серверов",
  [UserActionType.CONFIGURATOR_SLOT_DELETE]: "Удалён слот серверов",

  [UserActionType.DEAL_UPDATE]: "Обновлена  сделка",
  [UserActionType.DEAL_ADD]: "Добавлена сделка",
  [UserActionType.DEAL_DELETE]: "Удалена сделка",

  [UserActionType.DISTRIBUTOR_ADD]: "Добавлен дистрибьютор",
  [UserActionType.DISTRIBUTOR_UPDATE]: "Обновлён дистрибьютор",
  [UserActionType.DISTRIBUTOR_DELETE]: "Удалён дистрибьютор",

  [UserActionType.PARTNER_ACCEPT]: "Принята новая заявка от партнёра",
  [UserActionType.PARTNER_REJECT]: "Отклонена заявка от партнёра",
  [UserActionType.PARTNER_EDIT_MANAGER]: "Изменен ответственный менеджер партнера",

  [UserActionType.CREATE_USER]: "Создан пользователь",
  [UserActionType.UPDATE_USER]: "Обновлён пользователь",
  [UserActionType.ARCHIVE_USER]: "Пользователь архивирован (удалён)",
  [UserActionType.RESTORE_USER]: "Восстановление пользователя из архива",
  [UserActionType.USER_ARCHIVE]: "Пользователь архивирован (удалён)",

  [UserActionType.AUTH_UPDATE_PASSWORD]: "Обновление пароля пользователя",
  [UserActionType.AUTH_RECOVERY_PASSWORD]: "Запрос на восстановление пароля",

  [UserActionType.EMPLOYEE_ADD]: "Добавлена компания",
  [UserActionType.EMPLOYEE_ARCHIVE]: "Архивирована компания",

  [UserActionType.NEWS_ADD]: "Добавлена новость",
  [UserActionType.NEWS_UPDATE]: "Обновлена новость",
  [UserActionType.NEWS_DELETE]: "Удалена новость",

  [UserActionType.PROFILE_UPDATE]: "Обновлён профиль пользователя",
  [UserActionType.PROFILE_UPDATE_SETTINGS]:
    "Обновлены настройки профиля пользователя",
  [UserActionType.PROFILE_UPDATE_EMAIL]: "Обновлён email пользователя",
  [UserActionType.PROFILE_UPDATE_PASSWORD]: "Обновлён пароль пользователя",

  [UserActionType.REGISTRATION_EMPLOYEE]: "Зарегестрирована компания",
  [UserActionType.REGISTRATION_PARTNER]: "Зарегестрирован партнёр",
  [UserActionType.REGISTRATION_SUPERADMIN]: "Зарегестрирован супер-админ",
};
