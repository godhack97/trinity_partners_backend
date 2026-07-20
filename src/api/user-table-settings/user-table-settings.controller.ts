import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ForbiddenException,
  NotFoundException,
  ParseIntPipe,
} from "@nestjs/common";
import { UserTableSettingsService } from "./user-table-settings.service";
import { UserTableSettingsEntity } from "../../orm/entities/user-table-settings.entity";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthUser } from '@decorators/auth-user';
import { UserEntity } from '@orm/entities';

@ApiBearerAuth()
@ApiTags('user-table-settings')
@Controller("user-table-settings")
export class UserTableSettingsController {
  constructor(
    private readonly userTableSettingsService: UserTableSettingsService,
  ) {}

  @Get(":userId/:tableId")
  @ApiOperation({ summary: 'Получить настройки таблицы пользователя' })
  async getUserTableSettings(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("tableId") tableId: string,
    @AuthUser() authUser: UserEntity,
  ): Promise<UserTableSettingsEntity> {
    this.assertOwnSettings(userId, authUser);

    const settings = await this.userTableSettingsService.findByUserAndTable(
      userId,
      tableId,
    );

    if (!settings) {
      throw new NotFoundException("Настройки не найдены");
    }

    return settings;
  }

  @Post(":userId/:tableId")
  @ApiOperation({ summary: 'Записать настройки таблицы пользователя' })
  async upsertUserTableSettings(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("tableId") tableId: string,
    @Body() body: { data: string[] },
    @AuthUser() authUser: UserEntity,
  ): Promise<UserTableSettingsEntity> {
    this.assertOwnSettings(userId, authUser);

    let settings = await this.userTableSettingsService.findByUserAndTable(
      userId,
      tableId,
    );

    if (!settings) {
      settings = new UserTableSettingsEntity();
      settings.userId = userId;
      settings.tableId = tableId;
    }

    settings.data = body.data;

    return this.userTableSettingsService.save(settings);
  }

  private assertOwnSettings(userId: number, authUser: UserEntity): void {
    if (!authUser || authUser.id !== userId) {
      throw new ForbiddenException(
        "Нельзя читать или изменять настройки таблиц другого пользователя",
      );
    }
  }
}
