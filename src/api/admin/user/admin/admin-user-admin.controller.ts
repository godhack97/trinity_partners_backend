import { CreateAdminRequestDto } from "@api/admin/user/admin/dto/request/create-admin-request.dto";
import { SearchAdminDto } from "@api/admin/user/admin/dto/request/search-admin.dto";
import { UpdateAdminRequestDto } from "@api/admin/user/admin/dto/request/update-admin-request.dto";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { AdminUserAdminService } from "./admin-user-admin.service";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";

@ApiTags('admin/user/admin')
@ApiBearerAuth()
@Controller('admin/user/admin')
@Roles([RoleTypes.SuperAdmin])
export class AdminUserAdminController {
  constructor(private readonly adminUserAdminService: AdminUserAdminService) {}

  @Get()
  findAll( @Query() entry?: SearchAdminDto) {
    return this.adminUserAdminService.findAll(entry);
  }

  @Post()
  async create(@Body() data: CreateAdminRequestDto) {
    return await this.adminUserAdminService.create(data);
  }

  @Post(':id/update')
  async update(@Param('id') id: string, @Body() data: UpdateAdminRequestDto) {
    return await this.adminUserAdminService.update(+id, data);
  }

  @Post(':id/delete')
  async delete(@Param('id') id: string) {
    return await this.adminUserAdminService.delete(+id);
  }

  @ApiOperation({ summary: 'Восстановить пользователя (снять soft-delete)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID пользователя' })
  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.adminUserAdminService.restore(+id);
  }
}
