import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminUserService } from "./admin-user.service";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";
import { PaginationResponseDto } from "@app/dto/pagination.response.dto";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { UpdateCompanyEmployeeRequestDto } from "./dto/request/update-company-employee.request.dto";
import { AllUserFilterRequestDto } from "./dto/request/all-user-filter.request.dto";
import { UpdateAnyUserRequestDto } from "./dto/request/update-any-user.request.dto";
import { LogAction } from "@app/logs/log-action.decorator";
import { StrictRoles } from "@decorators/StrictRoles";

@ApiTags("user")
@ApiBearerAuth()
@Controller("admin/user")
@Roles([RoleTypes.SuperAdmin])
export class AdminUserController {
  constructor(private readonly adminUserRequest: AdminUserService) {}

  @Get()
  @ApiResponse({ type: PaginationResponseDto })
  findAll(@Query() filters: UserFilterRequestDto) {
    return this.adminUserRequest.find(filters);
  }

  @Get("all")
  @StrictRoles([RoleTypes.SuperAdmin])
  findAllUsers(@Query() filters: AllUserFilterRequestDto) {
    return this.adminUserRequest.findAllUsers(filters);
  }

  @Patch("all/:id")
  @StrictRoles([RoleTypes.SuperAdmin])
  @LogAction("admin_user_update", "users")
  updateAnyUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateAnyUserRequestDto,
  ) {
    return this.adminUserRequest.updateAnyUser(id, body);
  }

  @Post("all/:id/reset-password")
  @StrictRoles([RoleTypes.SuperAdmin])
  @LogAction("admin_user_password_reset", "users")
  resetPassword(@Param("id", ParseIntPipe) id: number) {
    return this.adminUserRequest.resetPassword(id);
  }

  @Patch(":id")
  updateCompanyEmployee(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateCompanyEmployeeRequestDto,
  ) {
    return this.adminUserRequest.updateCompanyEmployee(id, body);
  }

  @Post(":id/restore-employee")
  restoreCompanyEmployee(@Param("id", ParseIntPipe) id: number) {
    return this.adminUserRequest.restoreCompanyEmployee(id);
  }
}
