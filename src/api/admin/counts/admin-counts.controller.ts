import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiResponse, ApiOperation } from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { NewsService } from "@api/news/news.service";
import { DistributorService } from "@api/distributor/distributor.service";
import { AdminUserAdminService } from "@api/admin/user/admin/admin-user-admin.service";
import AdminPartnerService from "@api/admin/partner/admin-partner.service";
import { ConfiguratorService } from "@api/configurator/configurator.service";
import { CompanyStatus } from "@orm/entities";
import { UsersService } from "@api/users/users.service";
import { DealService } from "@api/deal/deal.service";
import { UserActionsService } from "@api/logs-list/user-actions.service";
import { request } from "http";

@ApiTags("counts")
@ApiBearerAuth()
@Controller("admin")
@Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager, RoleTypes.EmployeeAdmin])
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
  @ApiOperation({ summary: 'Получить количества сущностей' })
  @ApiResponse({ type: Object })
  async getAllCounts() {
    const [
      newsCount,
      // adminCount,
      // superAdminCount,
      // contentManagerCount,
      adminCount,
      rolesCounts,
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
      componentstypesCount,
      distributorsCount,

      allDealsCount,
      moderationCount,
      registeredCount,
      canceledCount,
      winCount,
      looseCount,
      requestDeletedCount,

      logsCount,
    ] = await Promise.all([
      this.newsService.getCount(),

      this.adminUserAdminService.getCount(),
      this.adminUserAdminService.getCountsByAllRoles(),
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
      this.configuratorService.componentstypesCount(),
      this.distributorService.getCount(),

      this.dealService.getCount(),
      this.dealService.getModerationCount(),
      this.dealService.getRegisteredCount(),
      this.dealService.getCanceledCount(),
      this.dealService.getWinCount(),
      this.dealService.getLooseCount(),
      this.dealService.getRequestDeletedCount(),

      this.userActionsService.getCount(),
    ]);

    return {
      news: newsCount,
      admins: {
        all: adminCount,
        archived: archivedCount,
        byRole: rolesCounts, // <- добавить все роли
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
        componentstypes: componentstypesCount,
      },
      deals: {
        distributors: distributorsCount,
        all: allDealsCount,
        moderation: moderationCount,
        registered: registeredCount,
        canceled: canceledCount,
        win: winCount,
        loose: looseCount,
        requestDeleted: requestDeletedCount,
      },
      tools: {
        logs: logsCount,
      },
    };
  }
}