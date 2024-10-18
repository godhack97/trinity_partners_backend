import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { AdminConfiguratorServerHeightService } from "./admin-configurator-server-height.service";
import { AddServerHeightRequestDto } from "./dto/request/add-server-height.request.dto";
import { UpdateServerHeightRequestDto } from "./dto/request/update-server-height.request.dto";

@ApiTags("admin/configurator/serverHeight")
@ApiBearerAuth()
@Controller('admin/configurator/serverHeight')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerHeightController {
  constructor(private readonly adminConfiguratorServerHeightService: AdminConfiguratorServerHeightService){}

  @Post('add')
  addServerHeight(@Body() data: AddServerHeightRequestDto) {
    return this.adminConfiguratorServerHeightService.addServerHeight(data)
  }

  @Post(':id/update')
  updateServerHeight(@Param('id') id: string, @Body() data: UpdateServerHeightRequestDto) {
    return this.adminConfiguratorServerHeightService.updateServerHeight(id, data)
  }

  @Post(':id/delete')
  deleteServerHeight(@Param('id') id: string) {
    return this.adminConfiguratorServerHeightService.deleteServerHeight(id)
  }
}