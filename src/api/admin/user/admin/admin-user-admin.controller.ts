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
import { LogAction } from 'src/logs/log-action.decorator';

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
  @LogAction('create_user')
  async create(@Body() data: CreateAdminRequestDto) {
    return await this.adminUserAdminService.create(data);
  }

  @Post(':id/update')
  @LogAction('update_user')
  async update(@Param('id') id: string, @Body() data: UpdateAdminRequestDto) {
    return await this.adminUserAdminService.update(+id, data);
  }

  @Post(':id/delete')
  @LogAction('archive_user')
  async delete(@Param('id') id: string) {
    return await this.adminUserAdminService.delete(+id);
  }

  @ApiOperation({ summary: 'Восстановить пользователя (снять soft-delete)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID пользователя' })
  @LogAction('restore_user')
  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.adminUserAdminService.restore(+id);
  }
}
