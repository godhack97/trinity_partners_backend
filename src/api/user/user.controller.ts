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
  ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags, ApiOperation } from "@nestjs/swagger";
import { TransformResponse } from "src/interceptors/transform-response.interceptor";
import { UserResponseDto } from "./dto/response/user.response.dto";
import { UpdatePartnerDto } from "./dto/request/update-partner.request.dto";
import { UpdateUserRequestDto } from "./dto/request/update-user.request.dto";
import { UserService } from "./user.service";
import { LogAction } from "src/logs/log-action.decorator";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";

@ApiTags("user")
@ApiBearerAuth()
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  @Roles([RoleTypes.SuperAdmin])
  @UseInterceptors(new TransformResponse(UserResponseDto, true))
  @ApiResponse({ type: [UserResponseDto] })
  findAll() {
    return this.userService.findAll();
  }

  @Patch('/partner/:id')
  @Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @UseInterceptors(new TransformResponse(UserResponseDto))
  @ApiOperation({ summary: 'Обновить менеджера партнера' })
  @LogAction('partner_edit_manager', 'users')
  @ApiResponse({ status: 200, description: 'Менеджер партнера обновлен', type: UserResponseDto })
  updatePartner(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdatePartnerDto
  ) {
    return this.userService.update(id, updateData);
  }

  @Patch(':id')
  @Roles([RoleTypes.SuperAdmin])
  @UseInterceptors(new TransformResponse(UserResponseDto))
  @ApiOperation({ summary: 'Обновить данные пользователя' })
  @LogAction("update_user", "users")
  @ApiResponse({ status: 200, description: 'Пользователь обновлен', type: UserResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })) updateData: UpdateUserRequestDto,
  ) {
    return this.userService.update(id, updateData);
  }

  @Get(":id")
  @Roles([RoleTypes.SuperAdmin])
  @UseInterceptors(new TransformResponse(UserResponseDto))
  @ApiResponse({ type: UserResponseDto })
  findOne(@Param("id") id: string) {
    return this.userService.findOne(+id);
  }

  @Post('update-role/:id')
  @Roles([RoleTypes.SuperAdmin])
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
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("user_role_update", "user_roles", ["user_id", "role_id"])
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
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("user_archive", "users")
  remove(@Param("id") id: string) {
    return this.userService.remove(+id);
  }
}
