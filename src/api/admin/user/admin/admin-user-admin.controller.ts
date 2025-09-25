import { CreateAdminRequestDto } from "@api/admin/user/admin/dto/request/create-admin-request.dto";
import { SearchAdminDto } from "@api/admin/user/admin/dto/request/search-admin.dto";
import { UpdateAdminRequestDto } from "@api/admin/user/admin/dto/request/update-admin-request.dto";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { AdminUserAdminService } from "./admin-user-admin.service";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("admin/user/admin")
@ApiBearerAuth()
@Controller("admin/user/admin")
@Roles([RoleTypes.SuperAdmin])
export class AdminUserAdminController {
  constructor(private readonly adminUserAdminService: AdminUserAdminService) {}

  @Get("/count")
  @ApiBearerAuth()
  @ApiResponse({ type: Number })
  async getCount() {
    return this.adminUserAdminService.getCount();
  }

  @Get("/count/:role")
  @ApiBearerAuth()
  @ApiParam({ name: "role", type: String, description: "Роль пользователя или 'all' для всех" })
  @ApiResponse({ type: Number })
  async getCountByRole(@Param("role") role: string) {
    return this.adminUserAdminService.getCountByRole(role);
  }

  @Get("/count/archived")
  @ApiBearerAuth()
  @ApiResponse({ type: Number })
  async getArchivedCount() {
    return this.adminUserAdminService.getArchivedCount();
  }

  @Get()
  @ApiBearerAuth()
  findAll(@Query() entry?: SearchAdminDto) {
    return this.adminUserAdminService.findAll(entry);
  }

  @Post()
  @ApiBearerAuth()
  @LogAction("create_user", "users")
  async create(@Body() data: CreateAdminRequestDto) {
    return await this.adminUserAdminService.create(data);
  }

  @Post(":id/update")
  @ApiBearerAuth()
  @LogAction("update_user", "users")
  async update(@Param("id") id: string, @Body() data: UpdateAdminRequestDto) {
    return await this.adminUserAdminService.update(+id, data);
  }

  @Post(":id/delete")
  @ApiBearerAuth()
  @LogAction("archive_user", "users")
  async delete(@Param("id") id: string) {
    return await this.adminUserAdminService.delete(+id);
  }

  @ApiOperation({ summary: "Восстановить пользователя (снять soft-delete)" })
  @ApiParam({ name: "id", type: Number, description: "ID пользователя" })
  @LogAction("restore_user", "users")
  @Post(":id/restore")
  async restore(@Param("id") id: string) {
    return this.adminUserAdminService.restore(+id);
  }
}