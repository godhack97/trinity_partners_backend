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
