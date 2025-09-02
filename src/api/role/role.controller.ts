import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleRequestDto } from './dto/request/create-role.request.dto';
import { UpdateRoleRequestDto } from './dto/request/update-role.request.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../decorators/permissions.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('role')
@UseGuards(AuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('api.roles.write')
  @ApiOperation({ summary: 'Создать роль' })
  @ApiResponse({ status: 201, description: 'Роль создана' })
  create(@Body() createRoleDto: CreateRoleRequestDto) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @RequirePermissions('api.roles.read')
  @ApiOperation({ summary: 'Получить все роли' })
  @ApiResponse({ status: 200, description: 'Список ролей' })
  findAll() {
    return this.roleService.findAll();
  }

  @Get('stats')
  @RequirePermissions('api.roles.read')
  @ApiOperation({ summary: 'Получить роли со статистикой' })
  @ApiResponse({ status: 200, description: 'Список ролей со статистикой' })
  getRolesWithStats() {
    return this.roleService.getRolesWithStats();
  }

  @Get(':id')
  @RequirePermissions('api.roles.read')
  @ApiOperation({ summary: 'Получить роль по ID' })
  @ApiResponse({ status: 200, description: 'Роль найдена' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Get(':id/can-delete')
  @RequirePermissions('api.roles.remove')
  @ApiOperation({ summary: 'Проверить можно ли удалить роль' })
  @ApiResponse({ status: 200, description: 'Результат проверки' })
  canDelete(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.canDeleteRole(id);
  }

  @Patch(':id')
  @RequirePermissions('api.roles.write')
  @ApiOperation({ summary: 'Обновить роль' })
  @ApiResponse({ status: 200, description: 'Роль обновлена' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleRequestDto
  ) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions('api.roles.remove')
  @ApiOperation({ summary: 'Удалить роль' })
  @ApiResponse({ status: 200, description: 'Роль удалена' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.roleService.remove(id);
    return { message: 'Роль успешно удалена' };
  }

  @Post(':id/restore')
  @RequirePermissions('api.roles.write')
  @ApiOperation({ summary: 'Восстановить удаленную роль' })
  @ApiResponse({ status: 200, description: 'Роль восстановлена' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.restore(id);
  }
}