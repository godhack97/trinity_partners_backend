import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  ParseIntPipe,
} from "@nestjs/common";
import { UserTableSettingsService } from "./user-table-settings.service";
import { UserTableSettingsEntity } from "../../orm/entities/user-table-settings.entity";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

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
  ): Promise<UserTableSettingsEntity> {
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
  ): Promise<UserTableSettingsEntity> {
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
}
