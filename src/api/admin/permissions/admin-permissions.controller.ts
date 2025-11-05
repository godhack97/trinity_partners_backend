import { Controller, Get, Post, Put, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from '../../../guards/permissions.guard';
import { RequirePermissions } from '../../../decorators/permissions.decorator';
import { AuthGuard } from '../../../guards/auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('permissions')
@Controller('admin/permissions')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminPermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('system.permissions.manage')
  @ApiOperation({ summary: 'Получить все разрешения' })
  async findAllPermissions() {
    return this.permissionsService.findAllPermissions();
  }

  @Get('by-type/:type')
  @RequirePermissions('system.permissions.manage')
  @ApiOperation({ summary: 'Получить разрешения по типу' })
  async getPermissionsByType(@Param('type') type: 'api' | 'menu' | 'system') {
    return this.permissionsService.getPermissionsByResourceType(type);
  }

  @Get('roles/:roleId')
  @RequirePermissions('system.permissions.manage')
  @ApiOperation({ summary: 'Получить разрешения роли' })
  async getRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.permissionsService.findRoleWithPermissions(roleId);
  }

  @Post('roles/:roleId/set')
  @RequirePermissions('system.permissions.manage')
  @ApiOperation({ summary: 'Установить разрешения роли' })
  async setRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body('permissionIds') permissionIds: number[]
  ) {
    await this.permissionsService.setRolePermissions(roleId, permissionIds);
    return { message: 'Разрешения обновлены' };
  }

  @Post('roles/:roleId/assign')
  @RequirePermissions('system.permissions.manage')
  @ApiOperation({ summary: 'Добавить разрешения к роли' })
  async assignPermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body('permissionIds') permissionIds: number[]
  ) {
    await this.permissionsService.assignPermissionsToRole(roleId, permissionIds);
    return { message: 'Разрешения добавлены' };
  }

  @Post('roles/:roleId/remove')
  @RequirePermissions('system.permissions.manage')
  @ApiOperation({ summary: 'Удалить разрешения у роли' })
  async removePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body('permissionIds') permissionIds: number[]
  ) {
    await this.permissionsService.removePermissionsFromRole(roleId, permissionIds);
    return { message: 'Разрешения удалены' };
  }

  @Post()
  @RequirePermissions('system.permissions.manage')
  @ApiOperation({ summary: 'Создать новое разрешение' })
  async createPermission(@Body() createPermissionDto: {
    name: string;
    description?: string;
    resource_type: 'api' | 'menu' | 'system';
    resource_name: string;
    action: string;
  }) {
    return this.permissionsService.createPermission(createPermissionDto);
  }
}