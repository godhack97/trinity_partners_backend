import { Body, Controller, Get, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminUserService } from "./admin-user.service";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
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
  @UseInterceptors(new TransformResponse(UserFilterRequestDto))
  @ApiResponse({ type: PaginationResponseDto })
  findAll(@Body() filters: UserFilterRequestDto) {
    return this.adminUserRequest.find(filters);
  }
}
