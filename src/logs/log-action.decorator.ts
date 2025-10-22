import { SetMetadata } from "@nestjs/common";

export const LOG_ACTION_KEY = "log_action";

export interface LogActionConfig {
  action: string;
  entity?: string;
  primaryKey?: string | string[];
}

export function LogAction(
  action: string,
  entity?: string,
  primaryKey?: string | string[]
) {
  return SetMetadata(LOG_ACTION_KEY, { action, entity, primaryKey });
}