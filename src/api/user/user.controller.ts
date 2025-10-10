import {
  Controller,
  Delete,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseInterceptors,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags, ApiOperation } from "@nestjs/swagger";
import { TransformResponse } from "src/interceptors/transform-response.interceptor";
import { UserResponseDto } from "./dto/response/user.response.dto";
import { UserService } from "./user.service";
import { LogAction } from "src/logs/log-action.decorator";
import { RequirePermissions } from "src/decorators/permissions.decorator";

@ApiTags("user")
@ApiBearerAuth()
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  @UseInterceptors(new TransformResponse(UserResponseDto, true))
  @ApiResponse({ type: [UserResponseDto] })
  findAll() {
    return this.userService.findAll();
  }

  @Patch(':id')
  @RequirePermissions('api.users.write')
  @UseInterceptors(new TransformResponse(UserResponseDto))
  @ApiOperation({ summary: 'Обновить данные пользователя' })
  @ApiResponse({ status: 200, description: 'Пользователь обновлен', type: UserResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Record<string, any>
  ) {
    return this.userService.update(id, updateData);
  }

  @Get(":id")
  @UseInterceptors(new TransformResponse(UserResponseDto))
  @ApiResponse({ type: UserResponseDto })
  findOne(@Param("id") id: string) {
    return this.userService.findOne(+id);
  }

  @Post('update-role/:id')
  @RequirePermissions('api.roles.write')
  @ApiOperation({ summary: 'Обновить роль пользователю' })
  @ApiResponse({ status: 200, description: 'Роль обновлена' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: {
      role_id: number;
    }
  ) {
    return this.userService.updateRole(id, updateRoleDto);
  }

  @Post('update-roles/:id')
  @RequirePermissions('api.roles.write')
  @ApiOperation({ summary: 'Обновить роли пользователю (множественные)' })
  @ApiResponse({ status: 200, description: 'Роли обновлены' })
  updateRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolesDto: {
      role_ids: number[];
    }
  ) {
    return this.userService.updateRoles(id, updateRolesDto);
  }

  @Delete(":id")
  @LogAction("user_archive", "users")
  remove(@Param("id") id: string) {
    return this.userService.remove(+id);
  }
}