import { LOG_ACTION_KEY } from "../../logs/log-action.decorator";
import { UserActionLabels, UserActionType } from "../../api/logs-list/user-actions.enum";
import { Bitrix24AdminController } from "./bitrix24-admin.controller";

describe("Bitrix24AdminController operator audit", () => {
  const auditedOperations = {
    forceResyncAll: UserActionType.BITRIX24_ADMIN_FORCE_RESYNC_ALL,
    forceSyncLead: UserActionType.BITRIX24_ADMIN_FORCE_SYNC_LEAD,
    convertLeadToDeal: UserActionType.BITRIX24_ADMIN_CONVERT_LEAD,
    updateLead: UserActionType.BITRIX24_ADMIN_UPDATE_LEAD,
    cleanupOldSyncData: UserActionType.BITRIX24_ADMIN_CLEANUP_SYNC,
    runSyncNow: UserActionType.BITRIX24_ADMIN_RUN_SYNC,
  } as const;

  it.each(Object.entries(auditedOperations))(
    "publishes operator audit metadata for %s",
    (methodName, action) => {
      const handler = Bitrix24AdminController.prototype[methodName];

      expect(Reflect.getMetadata(LOG_ACTION_KEY, handler)).toEqual({
        action,
        entity: "deals",
        primaryKey: undefined,
      });
      expect(UserActionLabels[action]).toEqual(expect.any(String));
      expect(UserActionLabels[action]).not.toBe(action);
    },
  );

  it("does not describe read-only and unimplemented endpoints as mutations", () => {
    for (const methodName of [
      "testConnection",
      "getSyncStatistics",
      "getLead",
      "validateLeads",
      "getDetailedLeadStatistics",
      "bulkConvertLeads",
    ]) {
      expect(
        Reflect.getMetadata(
          LOG_ACTION_KEY,
          Bitrix24AdminController.prototype[methodName],
        ),
      ).toBeUndefined();
    }
  });
});
