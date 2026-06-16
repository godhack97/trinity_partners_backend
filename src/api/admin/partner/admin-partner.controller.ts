import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import AdminPartnerService from "./admin-partner.service";
import { Roles } from "../../../decorators/Roles";
import { ApiBearerAuth, ApiTags, ApiResponse, ApiOperation } from "@nestjs/swagger";
import { RoleTypes } from "../../../types/RoleTypes";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";
import { LogAction } from "src/logs/log-action.decorator";
import { CompanyStatus, UserEntity } from "@orm/entities";
import { AuthUser } from "@decorators/auth-user";

@ApiTags("partner")
@ApiBearerAuth()
@Controller("admin/partner")
@Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
export class AdminPartnerController {
  constructor(private readonly adminPartnerService: AdminPartnerService) {}

  @Get("/count")
  @ApiOperation({ summary: 'Получить количество партнёров' })
  @ApiResponse({ type: Number })
  async getCount() {
    return this.adminPartnerService.getCount();
  }

  @Get("/count/pending")
  @ApiOperation({ summary: 'Получить количество партнёров (ожидающих принятия заявки)' })
  @ApiResponse({ type: Number })
  async getPendingCount() {
    return this.adminPartnerService.getCountByStatus(CompanyStatus.Pending);
  }

  @Get("/count/accepted")
  @ApiOperation({ summary: 'Получить количество партнёров (подтвержденных)' })
  @ApiResponse({ type: Number })
  async getAcceptedCount() {
    return this.adminPartnerService.getCountByStatus(CompanyStatus.Accept);
  }

  @Get("/count/rejected")
  @ApiOperation({ summary: 'Получить количество партнёров (отклонённых)' })
  @ApiResponse({ type: Number })
  async getRejectedCount() {
    return this.adminPartnerService.getCountByStatus(CompanyStatus.Reject);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список партнёров' })
  getAll(@Query() filters: PartnerFilterRequestDto) {
    return this.adminPartnerService.getAll(filters);
  }

  @Post(":id/accept")
  @LogAction("partner_accept", "companies")
  @ApiOperation({ summary: 'Принять заявку от партнёра' })
  acceptPartner(@Param("id") id: number, @AuthUser() auth_user: UserEntity) {
    return this.adminPartnerService.accept(id, auth_user);
  }

  @Post(":id/reject")
  @LogAction("partner_reject", "companies")
  @ApiOperation({ summary: 'Отклонить заявку от партнёра' })
  rejectPartner(@Param("id") id: number) {
    return this.adminPartnerService.reject(id);
  }

  @Post("employee/:id/accept")
  @LogAction("employee_trinity_accept", "company_employees")
  @ApiOperation({ summary: "Принять заявку сотрудника менеджером Тринити" })
  acceptEmployee(@Param("id") id: number, @AuthUser() auth_user: UserEntity) {
    return this.adminPartnerService.acceptEmployee(id, auth_user);
  }

  @Post("employee/:id/reject")
  @LogAction("employee_trinity_reject", "company_employees")
  @ApiOperation({ summary: "Отклонить заявку сотрудника менеджером Тринити" })
  rejectEmployee(@Param("id") id: number) {
    return this.adminPartnerService.rejectEmployee(id);
  }

  @Post(":id/suspend")
  @LogAction("partner_suspend", "companies")
  @ApiOperation({ summary: 'Приостановить доступ партнёра' })
  suspendPartner(@Param("id") id: number) {
    return this.adminPartnerService.suspend(id);
  }
}
