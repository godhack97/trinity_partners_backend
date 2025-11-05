import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { AdminConfiguratorServerHeightService } from "./admin-configurator-server-height.service";
import { AddServerHeightRequestDto } from "./dto/request/add-server-height.request.dto";
import { UpdateServerHeightRequestDto } from "./dto/request/update-server-height.request.dto";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("configurator/serverHeight")
@ApiBearerAuth()
@Controller("admin/configurator/serverHeight")
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerHeightController {
  constructor(
    private readonly adminConfiguratorServerHeightService: AdminConfiguratorServerHeightService,
  ) {}

  @Post("add")
  @LogAction("configurator_serverHeight_add", "cnf_serverbox_height")
  @ApiOperation({ summary: 'Создать высоту (корпус) сервера конфигуратора' })
  addServerHeight(@Body() data: AddServerHeightRequestDto) {
    return this.adminConfiguratorServerHeightService.addServerHeight(data);
  }

  @Post(":id/update")
  @LogAction("configurator_serverHeight_update", "cnf_serverbox_height")
  @ApiOperation({ summary: 'Обновить высоту (корпус) сервера конфигуратора' })
  updateServerHeight(
    @Param("id") id: string,
    @Body() data: UpdateServerHeightRequestDto,
  ) {
    return this.adminConfiguratorServerHeightService.updateServerHeight(
      id,
      data,
    );
  }

  @Post(":id/delete")
  @LogAction("configurator_serverHeight_delete", "cnf_serverbox_height")
  @ApiOperation({ summary: 'Удалить высоту (корпус) сервера конфигуратора' })
  deleteServerHeight(@Param("id") id: string) {
    return this.adminConfiguratorServerHeightService.deleteServerHeight(id);
  }
}
