import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
import { AuthUser } from "@decorators/auth-user";
import { UserEntity } from "@orm/entities";

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

  @Delete("all/:id")
  @ApiOperation({ operationId: "AdminUser_softDelete" })
  @StrictRoles([RoleTypes.SuperAdmin])
  @LogAction("admin_user_soft_delete", "users")
  softDeleteAnyUser(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() actor: UserEntity,
  ) {
    return this.adminUserRequest.softDeleteAnyUser(id, actor);
  }

  @Post("all/:id/restore")
  @ApiOperation({ operationId: "AdminUser_restore" })
  @StrictRoles([RoleTypes.SuperAdmin])
  @LogAction("admin_user_restore", "users")
  restoreAnyUser(@Param("id", ParseIntPipe) id: number) {
    return this.adminUserRequest.restoreAnyUser(id);
  }

  @Delete("all/:id/permanent")
  @ApiOperation({ operationId: "AdminUser_permanentlyDelete" })
  @StrictRoles([RoleTypes.SuperAdmin])
  @LogAction("admin_user_permanent_delete", "users")
  permanentlyDeleteAnyUser(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() actor: UserEntity,
  ) {
    return this.adminUserRequest.permanentlyDeleteAnyUser(id, actor);
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
