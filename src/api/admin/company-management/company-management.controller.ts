import { AuthUser } from "@decorators/auth-user";
import { Roles } from "@decorators/Roles";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RoleTypes } from "@app/types/RoleTypes";
import { UserEntity } from "@orm/entities";
import { CompanyManagementService } from "./company-management.service";
import {
  ApproveCompanyRequestDto,
  AssignCompanyManagerRequestDto,
  COMPANY_MANAGEMENT_READ_ROLES,
  CompanyListQueryDto,
  CompanyRestrictionReasonRequestDto,
} from "./dto/company-management.request.dto";
import {
  CompanyDetailResponseDto,
  CompanyListResponseDto,
  CompanyManagerSummaryDto,
} from "./dto/company-management.response.dto";
import { LogAction } from "src/logs/log-action.decorator";

const strictValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags("company-management")
@ApiBearerAuth()
@Controller("admin/companies")
@Roles(COMPANY_MANAGEMENT_READ_ROLES)
export class CompanyManagementController {
  constructor(private readonly companies: CompanyManagementService) {}

  @Get()
  @ApiOperation({ summary: "Получить доступные компании" })
  @ApiOkResponse({ type: CompanyListResponseDto })
  list(
    @Query(strictValidation) filters: CompanyListQueryDto,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.list(filters, actor);
  }

  @Get("managers")
  @ApiOkResponse({ type: [CompanyManagerSummaryDto] })
  managers() {
    return this.companies.managerOptions();
  }

  @Get(":id")
  @ApiOkResponse({ type: CompanyDetailResponseDto })
  detail(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.detail(id, actor);
  }

  @Post(":id/approve")
  @Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @LogAction("company_approve", "companies")
  approve(
    @Param("id", ParseIntPipe) id: number,
    @Body(strictValidation) body: ApproveCompanyRequestDto,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.approve(id, actor, body);
  }

  @Post(":id/review-lock")
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("company_review_lock", "companies")
  lockReview(
    @Param("id", ParseIntPipe) id: number,
    @Body(strictValidation) body: CompanyRestrictionReasonRequestDto,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.lockReview(id, actor, body);
  }

  @Post(":id/review-unlock")
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("company_review_unlock", "companies")
  unlockReview(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.unlockReview(id, actor);
  }

  @Post(":id/suspend")
  @Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @LogAction("company_suspend", "companies")
  suspend(
    @Param("id", ParseIntPipe) id: number,
    @Body(strictValidation) body: CompanyRestrictionReasonRequestDto,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.suspend(id, actor, body);
  }

  @Post(":id/resume")
  @Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @LogAction("company_resume", "companies")
  resume(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.resume(id, actor);
  }

  @Patch(":id/responsible-manager")
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("company_manager_assign", "companies")
  assignManager(
    @Param("id", ParseIntPipe) id: number,
    @Body(strictValidation) body: AssignCompanyManagerRequestDto,
    @AuthUser() actor: UserEntity,
  ) {
    return this.companies.assignManager(id, actor, body);
  }
}
