import { AdminConfiguratorServerService } from "./admin-configurator-server.service";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Body, Controller, Param, Post } from "@nestjs/common";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { AddServerRequestDto } from "./dto/request/add-server.request.dto";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("configurator/server")
@ApiBearerAuth()
@Controller("admin/configurator/server")
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerController {
  constructor(
    private readonly adminConfiguratorServerService: AdminConfiguratorServerService,
  ) {}

  @Post("add")
  @LogAction("configurator_server_add", "cnf_servers")
  @ApiOperation({ summary: 'Создать сервер конфигуратора' })
  addServer(@Body() data: AddServerRequestDto) {
    return this.adminConfiguratorServerService.addServer(data);
  }

  @Post(":id/update")
  @LogAction("configurator_server_update", "cnf_servers")
  @ApiOperation({ summary: 'Обновить сервер конфигуратора' })
  updateServer(@Param("id") id: string, @Body() data: AddServerRequestDto) {
    return this.adminConfiguratorServerService.updateServer(id, data);
  }

  @Post(":id/delete")
  @LogAction("configurator_server_delete", "cnf_servers")
  @ApiOperation({ summary: 'Удалить сервер конфигуратора' })
  deleteServer(@Param("id") id: string) {
    return this.adminConfiguratorServerService.deleteServer(id);
  }
}
