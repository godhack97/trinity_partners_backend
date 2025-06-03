import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AdminConfiguratorMultislotService } from "./admin-configurator-multislot.service";
import { CreateMultislotRequestDto } from "./dto/request/create-multislot.request.dto";
import { UpdateMultislotRequestDto } from "./dto/request/update-multislot.request.dto";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { LogAction } from 'src/logs/log-action.decorator';

@ApiTags('admin/configurator/multislot')
@ApiBearerAuth()
@Controller('admin/configurator/multislot')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorMultislotController {
  constructor(private readonly adminConfiguratorMultislotService: AdminConfiguratorMultislotService){}

  @Get()
  getMultislots() {
    return this.adminConfiguratorMultislotService.getMultislots()
  }

  @Post('create')
  @LogAction('configurator_multislot_add')
  createMultislot(@Body() data: CreateMultislotRequestDto) {
    return this.adminConfiguratorMultislotService.createMultislot(data);
  }

  @Post(':id/update')
  @LogAction('configurator_multislot_update')
  updateMultislot(@Param('id') id: string, @Body() data: UpdateMultislotRequestDto) {
    return this.adminConfiguratorMultislotService.updateMultislot(id, data);
  }

  @Post(':id/delete')
  @LogAction('configurator_multislot_delete')
  deleteMultislot(@Param('id') id: string) {
    return this.adminConfiguratorMultislotService.deleteMultislot(id);
  }
}