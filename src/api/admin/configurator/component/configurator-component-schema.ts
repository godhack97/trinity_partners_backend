export const CONFIGURATOR_COMPONENT_SCHEMA_VERSION = 2;

export const CONFIGURATOR_COMPONENT_BACKUP_FIELDS = [
  "id",
  "type_id",
  "subtype",
  "price",
  "name",
  "description",
  "server_generation_id",
  "processor_generation_id",
  "created_at",
  "updated_at",
] as const;

export const CONFIGURATOR_COMPONENT_SLOT_BACKUP_FIELDS = [
  "id",
  "component_id",
  "slot_id",
  "amount",
  "increase",
  "created_at",
  "updated_at",
] as const;
