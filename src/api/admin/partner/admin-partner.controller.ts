import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import AdminPartnerService from "./admin-partner.service";
import { Roles } from "../../../decorators/Roles";
import { ApiBearerAuth, ApiTags, ApiResponse, ApiOperation } from "@nestjs/swagger";
import { RoleTypes } from "../../../types/RoleTypes";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";
import { LogAction } from "src/logs/log-action.decorator";
import { CompanyStatus } from "@orm/entities";

@ApiTags("partner")
@ApiBearerAuth()
@Controller("admin/partner")
@Roles([RoleTypes.SuperAdmin])
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
  acceptPartner(@Param("id") id: number) {
    return this.adminPartnerService.accept(id);
  }

  @Post(":id/reject")
  @LogAction("partner_reject", "companies")
  @ApiOperation({ summary: 'Отклонить заявку от партнёра' })
  rejectPartner(@Param("id") id: number) {
    return this.adminPartnerService.reject(id);
  }
}
