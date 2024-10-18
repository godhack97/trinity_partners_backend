import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";
import { CreateConfigurationComponentRequestDto } from "./dto/request/create-configurator-component.request.dto";

@ApiTags("admin/configurator/component")
@ApiBearerAuth()
@Controller('admin/configurator/component')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorComponentController {
  constructor(private readonly adminConfiguratorComponentService: AdminConfiguratorComponentService) {
  }

  @Post()
  createComponent(@Body() data: CreateConfigurationComponentRequestDto) {
    return this.adminConfiguratorComponentService.createComponent(data)
  }

  @Post(':id/update')
  update(@Param('id') id: string, @Body() data: any) {
    return this.adminConfiguratorComponentService.updateComponent(id, data)
  }
  @Post(':id/delete')
  deleteComponent(@Param('id') id: string) {
    return this.adminConfiguratorComponentService.deleteComponent(id)
  }

}