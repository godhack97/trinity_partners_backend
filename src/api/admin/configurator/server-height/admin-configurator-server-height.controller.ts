import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { AdminConfiguratorServerHeightService } from "./admin-configurator-server-height.service";
import { AddServerHeightRequestDto } from "./dto/request/add-server-height.request.dto";
import { UpdateServerHeightRequestDto } from "./dto/request/update-server-height.request.dto";
import { LogAction } from 'src/logs/log-action.decorator';

@ApiTags("admin/configurator/serverHeight")
@ApiBearerAuth()
@Controller('admin/configurator/serverHeight')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerHeightController {
  constructor(private readonly adminConfiguratorServerHeightService: AdminConfiguratorServerHeightService){}

  @Post('add')
  @LogAction('configurator_serverHeight_add', 'cnf_serverbox_height')
  addServerHeight(@Body() data: AddServerHeightRequestDto) {
    return this.adminConfiguratorServerHeightService.addServerHeight(data)
  }

  @Post(':id/update')
  @LogAction('configurator_serverHeight_update', 'cnf_serverbox_height')
  updateServerHeight(@Param('id') id: string, @Body() data: UpdateServerHeightRequestDto) {
    return this.adminConfiguratorServerHeightService.updateServerHeight(id, data)
  }

  @Post(':id/delete')
  @LogAction('configurator_serverHeight_delete', 'cnf_serverbox_height')
  deleteServerHeight(@Param('id') id: string) {
    return this.adminConfiguratorServerHeightService.deleteServerHeight(id)
  }
}