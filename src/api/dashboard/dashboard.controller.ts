import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "@decorators/auth-user";
import { UserEntity } from "@orm/entities";
import { DashboardService } from "./dashboard.service";
import { DashboardSummaryResponseDto } from "./dto/response/dashboard-summary-response.dto";

@ApiTags("dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @ApiResponse({ type: DashboardSummaryResponseDto })
  getSummary(@AuthUser() auth_user: UserEntity) {
    return this.dashboardService.getSummary(auth_user);
  }
}
