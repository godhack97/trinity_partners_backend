import { Roles } from "@decorators/Roles";
import { Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RoleTypes } from "@app/types/RoleTypes";
import { CompanyNotificationOutboxService } from "./company-notification-outbox.service";

@ApiTags("company-notifications")
@ApiBearerAuth()
@Controller("admin/company-notifications")
@Roles([RoleTypes.SuperAdmin])
export class CompanyNotificationOutboxController {
  constructor(private readonly outbox: CompanyNotificationOutboxService) {}

  @Get("summary")
  @ApiOperation({ summary: "Статистика доставки уведомлений компаний" })
  @ApiOkResponse({
    schema: {
      example: {
        counts: { pending: 0, processing: 0, delivered: 12, failed: 0 },
        oldest_pending_at: null,
      },
    },
  })
  summary() {
    return this.outbox.summary();
  }

  @Post("retry-failed")
  @ApiOperation({ summary: "Повторить окончательно упавшие уведомления компаний" })
  retryFailed() {
    return this.outbox.retryFailed().then((retried) => ({ retried }));
  }
}
