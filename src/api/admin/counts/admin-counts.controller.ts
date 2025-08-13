import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiResponse } from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { NewsService } from "@api/news/news.service";
import { DistributorService } from "@api/distributor/distributor.service";
import {
  AdminUserAdminService,
  SearchRoleAdminTypes,
} from "@api/admin/user/admin/admin-user-admin.service";
import AdminPartnerService from "@api/admin/partner/admin-partner.service";
import { ConfiguratorService } from "@api/configurator/configurator.service";
import { CompanyStatus } from "@orm/entities";
import { UsersService } from "@api/users/users.service";
import { DealService } from "@api/deal/deal.service";
import { UserActionsService } from "@api/logs-list/user-actions.service";

@ApiTags("admin/counts")
@ApiBearerAuth()
@Controller("admin")
@Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
export class AdminCountsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly adminUserAdminService: AdminUserAdminService,
    private readonly adminPartnerService: AdminPartnerService,
    private readonly configuratorService: ConfiguratorService,
    private readonly distributorService: DistributorService,
    private readonly usersService: UsersService,
    private readonly dealService: DealService,
    private readonly userActionsService: UserActionsService,
  ) {}

  @Get("/counts")
  @ApiResponse({ type: Object })
  async getAllCounts() {
    const [
      newsCount,
      adminCount,
      superAdminCount,
      contentManagerCount,
      archivedCount,
      partnersUsersCount,
      partnerRequestsCount,
      partnersCount,
      partnersRejectedCount,
      serverboxCount,
      slotsCount,
      serverGenerationsCount,
      serversCount,
      processorGenerationsCount,
      componentsCount,
      distributorsCount,

      allDealsCount,
      moderationCount,
      registeredCount,
      canceledCount,
      winCount,
      looseCount,
      logsCount,
    ] = await Promise.all([
      this.newsService.getCount(),

      this.adminUserAdminService.getCount(),
      this.adminUserAdminService.getCountByRole(
        SearchRoleAdminTypes.SuperAdmin,
      ),
      this.adminUserAdminService.getCountByRole(
        SearchRoleAdminTypes.ContentManager,
      ),
      this.adminUserAdminService.getArchivedCount(),

      this.usersService.getCount(),
      this.adminPartnerService.getCountByStatus(CompanyStatus.Pending),
      this.adminPartnerService.getCountByStatus(CompanyStatus.Accept),
      this.adminPartnerService.getCountByStatus(CompanyStatus.Reject),

      this.configuratorService.getServerboxCount(),
      this.configuratorService.getSlotsCount(),
      this.configuratorService.getServerGenerationsCount(),
      this.configuratorService.getServersCount(),
      this.configuratorService.getProcessorGenerationsCount(),
      this.configuratorService.getComponentsCount(),
      this.distributorService.getCount(),

      this.dealService.getCount(),
      this.dealService.getModerationCount(),
      this.dealService.getRegisteredCount(),
      this.dealService.getCanceledCount(),
      this.dealService.getWinCount(),
      this.dealService.getLooseCount(),

      this.userActionsService.getCount(),
    ]);

    return {
      news: newsCount,
      admins: {
        all: adminCount,
        superAdmin: superAdminCount,
        contentManager: contentManagerCount,
        archived: archivedCount,
      },
      partners: {
        users: partnersUsersCount,
        requests: partnerRequestsCount,
        accepted: partnersCount,
        rejected: partnersRejectedCount,
      },
      configurator: {
        serverboxes: serverboxCount,
        slots: slotsCount,
        serverGenerations: serverGenerationsCount,
        servers: serversCount,
        processorGenerations: processorGenerationsCount,
        components: componentsCount,
      },
      deals: {
        distributors: distributorsCount,
        all: allDealsCount,
        moderation: moderationCount,
        registered: registeredCount,
        canceled: canceledCount,
        win: winCount,
        loose: looseCount,
      },
      tools: {
        logs: logsCount,
      },
    };
  }
}
