import { AdminConfiguratorSlotService } from "./admin-configurator-slot.service";
import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { CreateSlotRequestDto } from "@api/admin/configurator/slot/dto/request/create-slot.request.dto";
import { LogAction } from 'src/logs/log-action.decorator';

@ApiTags('admin/configurator/slot')
@ApiBearerAuth()
@Controller('admin/configurator/slot')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorSlotController {
  constructor(private readonly adminConfiguratorSlotService: AdminConfiguratorSlotService) {}

  @Post('add')
  @LogAction('configurator_slot_add')
  create(@Body() data: CreateSlotRequestDto) {
    return this.adminConfiguratorSlotService.create(data)
  }

  @Post(':id/update')
  @LogAction('configurator_slot_update')
  updateSlot(@Param('id') id: string, @Body() data: CreateSlotRequestDto) {
    return this.adminConfiguratorSlotService.updateSlot(id, data)
  }

  @Post(':id/delete')
  @LogAction('configurator_slot_delete')
  deleteSlot(@Param('id') id: string) {
    return this.adminConfiguratorSlotService.deleteSlot(id)
  }
}