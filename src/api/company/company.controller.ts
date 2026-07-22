import { RoleTypes } from "@app/types/RoleTypes";
import { AuthUser } from "@decorators/auth-user";
import { Roles } from "@decorators/Roles";
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseInterceptors,
  ValidationPipe,
  Query,
} from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { CompanyService } from "./company.service";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AddEmployeeRequestDto } from "./dto/request/add-employee.request.dto";
import { AddEmployeeAdminRequestDto } from "./dto/request/add-employee-admin-request.dto";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { CompanyEmployeesWithEmpoloyeeResponseDto } from "./dto/response/company-employees-response.dto";
import { LogAction } from "src/logs/log-action.decorator";
import { PartnershipType } from "@orm/entities/company.entity";
import { CompanyManagementService } from "@api/admin/company-management/company-management.service";
import { UpdateCompanyContactsRequestDto } from "@api/admin/company-management/dto/company-management.request.dto";
import {
  CompanyAccessStateResponseDto,
  CompanyDetailResponseDto,
} from "@api/admin/company-management/dto/company-management.response.dto";
import { AllowRestrictedCompanyAccess } from "@decorators/AllowRestrictedCompanyAccess";

@ApiTags("company")
@ApiBearerAuth()
@Controller("company")
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly companyManagementService: CompanyManagementService,
  ) {}

  @Get("profile")
  @Roles([RoleTypes.Partner, RoleTypes.CompanyAdmin])
  @ApiResponse({ type: CompanyDetailResponseDto })
  getOwnCompany(@AuthUser() auth_user: UserEntity) {
    return this.companyManagementService.ownCompany(auth_user);
  }

  @Patch("profile/contacts")
  @Roles([RoleTypes.Partner, RoleTypes.CompanyAdmin])
  @LogAction("company_contacts_update", "companies")
  @ApiResponse({ type: CompanyDetailResponseDto })
  updateOwnCompanyContacts(
    @AuthUser() auth_user: UserEntity,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    data: UpdateCompanyContactsRequestDto,
  ) {
    return this.companyManagementService.updateOwnContacts(auth_user, data);
  }

  @Get("access-state")
  @AllowRestrictedCompanyAccess()
  @Roles([RoleTypes.Partner, RoleTypes.CompanyAdmin])
  @ApiResponse({ type: CompanyAccessStateResponseDto })
  getCompanyAccessState(@AuthUser() auth_user: UserEntity) {
    return this.companyManagementService.accessState(auth_user);
  }

  @Get("partners/:partnershipType")
  @Roles([RoleTypes.Partner, RoleTypes.EmployeeAdmin, RoleTypes.SuperAdmin])
  findByPartnershipType(@Param("partnershipType") partnershipType: PartnershipType) {
    return this.companyService.findByPartnershipType(partnershipType);
  }

  @Post("add-employee")
  @LogAction("employee_add", "company_employees")
  @Roles([RoleTypes.Partner, RoleTypes.EmployeeAdmin, RoleTypes.SuperAdmin])
  addEmployee(
    @AuthUser() auth_user: UserEntity,
    @Body() addEmployeeDto: AddEmployeeRequestDto,
  ) {
    return this.companyService.addEmployee(auth_user, addEmployeeDto);
  }

  @Post("invite-employee")
  @LogAction("employee_invite", "company_employees")
  @Roles([RoleTypes.Partner, RoleTypes.EmployeeAdmin, RoleTypes.CompanyAdmin, RoleTypes.SuperAdmin])
  inviteEmployee(
    @AuthUser() auth_user: UserEntity,
    @Body() addEmployeeDto: AddEmployeeRequestDto,
  ) {
    return this.companyService.inviteEmployee(auth_user, addEmployeeDto);
  }

  @Get("get-employees")
  @UseInterceptors(
    new TransformResponse(CompanyEmployeesWithEmpoloyeeResponseDto, true),
  )
  @ApiResponse({ type: [CompanyEmployeesWithEmpoloyeeResponseDto] })
  getCompanyEmployees(
    @Req() request: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.companyService.getCompanyEmployees(
      request,
      companyId ? Number(companyId) : undefined,
    );
  }

  @Patch("change-admin-status/:id")
  changeStatusEmployeeAdmin(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() changeStatasEmployeeAdminDto: AddEmployeeAdminRequestDto,
  ) {
    return this.companyService.changeStatusEmployeeAdmin(
      request,
      +id,
      changeStatasEmployeeAdminDto,
    );
  }

  @Patch("transfer-admin/:id")
  @LogAction("employee_transfer_admin", "company_employees")
  transferAdminRights(@Req() request: Request, @Param("id") id: string) {
    return this.companyService.transferAdminRights(request, +id);
  }

  @Patch("remove-employee/:id")
  @LogAction("employee_archive", "users")
  removeEmployee(@Req() request: Request, @Param("id") id: string) {
    return this.companyService.removeEmployee(request, +id);
  }
}
