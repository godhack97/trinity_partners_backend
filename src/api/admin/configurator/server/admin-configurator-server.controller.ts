import { AdminConfiguratorServerService } from "./admin-configurator-server.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Param, Post } from "@nestjs/common";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { AddServerRequestDto } from "./dto/request/add-server.request.dto";
import { LogAction } from 'src/logs/log-action.decorator';

@ApiTags('admin/configurator/server')
@ApiBearerAuth()
@Controller('admin/configurator/server')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerController {
  constructor(private readonly adminConfiguratorServerService: AdminConfiguratorServerService) {}

  @Post('add')
  @LogAction('configurator_server_add', 'cnf_servers')
  addServer(@Body() data: AddServerRequestDto) {
    return this.adminConfiguratorServerService.addServer(data)
  }

  @Post(':id/update')
  @LogAction('configurator_server_update', 'cnf_servers')
  updateServer(@Param('id') id: string, @Body() data: AddServerRequestDto) {
    return this.adminConfiguratorServerService.updateServer(id, data)
  }

  @Post(':id/delete')
  @LogAction('configurator_server_delete', 'cnf_servers')
  deleteServer(@Param('id') id: string) {
    return this.adminConfiguratorServerService.deleteServer(id)
  }
}