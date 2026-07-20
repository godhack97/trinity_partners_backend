import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminUserService } from "./admin-user.service";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";
import { PaginationResponseDto } from "@app/dto/pagination.response.dto";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";

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

  @Post(":id/restore-employee")
  restoreCompanyEmployee(@Param("id") id: string) {
    return this.adminUserRequest.restoreCompanyEmployee(+id);
  }
}
