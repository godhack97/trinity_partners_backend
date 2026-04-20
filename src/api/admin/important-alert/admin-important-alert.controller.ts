import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { AuthUser } from "@decorators/auth-user";
import { RoleTypes } from "@app/types/RoleTypes";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { UserEntity } from "@orm/entities";
import { LogAction } from "src/logs/log-action.decorator";
import { AdminImportantAlertService } from "./admin-important-alert.service";
import { CreateImportantAlertDto } from "./dto/create-important-alert.dto";
import { UpdateImportantAlertDto } from "./dto/update-important-alert.dto";
import { ImportantAlertResponseDto } from "./dto/important-alert-response.dto";

@ApiTags("important-alerts")
@ApiBearerAuth()
@Controller("admin/important-alerts")
@Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
export class AdminImportantAlertController {
  constructor(
    private readonly adminImportantAlertService: AdminImportantAlertService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Получить список важных оповещений" })
  @ApiResponse({ type: [ImportantAlertResponseDto] })
  async findAll() {
    return this.adminImportantAlertService.findAll();
  }

  @Get("/count")
  @ApiOperation({ summary: "Получить количество важных оповещений" })
  @ApiResponse({ type: Number })
  async getCount() {
    return this.adminImportantAlertService.getCount();
  }

  @Get("/:id")
  @ApiOperation({ summary: "Получить важное оповещение по ID" })
  @UseInterceptors(new TransformResponse(ImportantAlertResponseDto))
  @ApiResponse({ type: ImportantAlertResponseDto })
  async findOne(@Param("id") id: number) {
    return this.adminImportantAlertService.findOne(+id);
  }

  @Post()
  @LogAction("important_alert_add", "important_alerts")
  @ApiOperation({ summary: "Создать важное оповещение" })
  @UseInterceptors(new TransformResponse(ImportantAlertResponseDto))
  @ApiResponse({ type: ImportantAlertResponseDto })
  async create(
    @Body() data: CreateImportantAlertDto,
    @AuthUser() auth_user: Partial<UserEntity>,
  ) {
    return this.adminImportantAlertService.create(data, auth_user.id);
  }

  @Post("/:id")
  @LogAction("important_alert_update", "important_alerts")
  @ApiOperation({ summary: "Обновить важное оповещение" })
  @UseInterceptors(new TransformResponse(ImportantAlertResponseDto))
  @ApiResponse({ type: ImportantAlertResponseDto })
  async update(
    @Param("id") id: number,
    @Body() data: UpdateImportantAlertDto,
  ) {
    return this.adminImportantAlertService.update(+id, data);
  }

  @Post("/:id/delete")
  @LogAction("important_alert_delete", "important_alerts")
  @ApiOperation({ summary: "Удалить важное оповещение" })
  async delete(@Param("id") id: number) {
    return this.adminImportantAlertService.delete(+id);
  }
}
