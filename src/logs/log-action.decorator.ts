import { SetMetadata } from "@nestjs/common";

export const LOG_ACTION_KEY = "log_action";

export function LogAction(action: string, entity?: string) {
  return SetMetadata(LOG_ACTION_KEY, { action, entity });
}
