import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { AuthUser } from "@decorators/auth-user";
import { RoleTypes } from "@app/types/RoleTypes";
import { NewsService } from "@api/news/news.service";
import { DistributorService } from "@api/distributor/distributor.service";
import { AdminUserAdminService } from "@api/admin/user/admin/admin-user-admin.service";
import { AdminUserService } from "@api/admin/user/admin-user.service";
import AdminPartnerService from "@api/admin/partner/admin-partner.service";
import { ConfiguratorService } from "@api/configurator/configurator.service";
import { CompanyStatus, UserEntity } from "@orm/entities";
import { DealService } from "@api/deal/deal.service";
import { UserActionsService } from "@api/logs-list/user-actions.service";
import { AdminImportantAlertService } from "@api/admin/important-alert/admin-important-alert.service";
import { AdminCountsResponseDto } from "./dto/admin-counts.response.dto";

@ApiTags("counts")
@ApiBearerAuth()
@Controller("admin")
@Roles([
  RoleTypes.SuperAdmin,
  RoleTypes.ContentManager,
  RoleTypes.EmployeeAdmin,
  RoleTypes.PartnerManager,
  RoleTypes.TechnicalSpecialist,
])
export class AdminCountsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly adminUserAdminService: AdminUserAdminService,
    private readonly adminUserService: AdminUserService,
    private readonly adminPartnerService: AdminPartnerService,
    private readonly configuratorService: ConfiguratorService,
    private readonly distributorService: DistributorService,
    private readonly dealService: DealService,
    private readonly userActionsService: UserActionsService,
    private readonly adminImportantAlertService: AdminImportantAlertService,
  ) {}

  @Get("/counts")
  @ApiOperation({ summary: "Получить доступные текущей роли количества сущностей" })
  @ApiOkResponse({ type: AdminCountsResponseDto })
  async getAllCounts(
    @AuthUser() authUser: UserEntity,
  ): Promise<AdminCountsResponseDto> {
    const response: AdminCountsResponseDto = {};
    const isSuperAdmin = this.hasRole(authUser, RoleTypes.SuperAdmin);
    const canViewContent =
      isSuperAdmin || this.hasRole(authUser, RoleTypes.ContentManager);

    const sections: Promise<void>[] = [];

    if (isSuperAdmin) {
      sections.push(this.loadSuperAdminCounts(response, authUser));
    }
    if (isSuperAdmin) {
      sections.push(this.loadPartnerCounts(response, isSuperAdmin));
    }
    if (canViewContent) {
      sections.push(this.loadContentCounts(response));
    }

    await Promise.all(sections);
    return response;
  }

  private async loadContentCounts(response: AdminCountsResponseDto) {
    const [newsCount, importantAlertsCount] = await Promise.all([
      this.newsService.getCount(),
      this.adminImportantAlertService.getCount(),
    ]);

    response.news = newsCount;
    response.importantAlerts = importantAlertsCount;
  }

  private async loadPartnerCounts(
    response: AdminCountsResponseDto,
    includeCompanyEmployees: boolean,
  ) {
    const [requests, accepted, rejected, suspended, users] = await Promise.all([
      this.adminPartnerService.getCountByStatus(CompanyStatus.Pending),
      this.adminPartnerService.getCountByStatus(CompanyStatus.Accept),
      Promise.resolve(0),
      this.adminPartnerService.getCountByStatus(CompanyStatus.Suspended),
      includeCompanyEmployees
        ? this.adminUserService.getCount()
        : Promise.resolve(undefined),
    ]);

    response.partners = {
      ...(users === undefined ? {} : { users }),
      requests,
      accepted,
      rejected,
      suspended,
    };
  }

  private async loadSuperAdminCounts(
    response: AdminCountsResponseDto,
    authUser: UserEntity,
  ) {
    const [
      adminCount,
      rolesCounts,
      archivedCount,
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
      this.adminUserAdminService.getCount(),
      this.adminUserAdminService.getCountsByAllRoles(),
      this.adminUserAdminService.getArchivedCount(),
      this.configuratorService.getServerboxCount(),
      this.configuratorService.getSlotsCount(),
      this.configuratorService.getServerGenerationsCount(),
      this.configuratorService.getServersCount(),
      this.configuratorService.getProcessorGenerationsCount(),
      this.configuratorService.getComponentsCount(),
      this.configuratorService.componentstypesCount(),
      this.distributorService.getCount(),
      this.dealService.getCount(authUser),
      this.dealService.getModerationCount(authUser),
      this.dealService.getRegisteredCount(authUser),
      this.dealService.getCanceledCount(authUser),
      this.dealService.getWinCount(authUser),
      this.dealService.getLooseCount(authUser),
      this.dealService.getRequestDeletedCount(),
      this.userActionsService.getCount(),
    ]);

    response.admins = {
      all: adminCount,
      archived: archivedCount,
      byRole: rolesCounts,
    };
    response.configurator = {
      serverboxes: serverboxCount,
      slots: slotsCount,
      serverGenerations: serverGenerationsCount,
      servers: serversCount,
      processorGenerations: processorGenerationsCount,
      components: componentsCount,
      componentstypes: componentstypesCount,
    };
    response.deals = {
      distributors: distributorsCount,
      all: allDealsCount,
      moderation: moderationCount,
      registered: registeredCount,
      canceled: canceledCount,
      win: winCount,
      loose: looseCount,
      requestDeleted: requestDeletedCount,
    };
    response.tools = { logs: logsCount };
  }

  private hasRole(user: UserEntity, role: RoleTypes): boolean {
    return (
      user?.role?.name === role ||
      user?.user_roles?.some(userRole => userRole.role?.name === role) ||
      user?.roles?.some(userRole => userRole.name === role)
    );
  }
}
