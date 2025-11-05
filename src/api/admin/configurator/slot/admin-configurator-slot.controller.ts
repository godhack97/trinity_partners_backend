import { AdminConfiguratorSlotService } from "./admin-configurator-slot.service";
import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { CreateSlotRequestDto } from "@api/admin/configurator/slot/dto/request/create-slot.request.dto";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("configurator/slot")
@ApiBearerAuth()
@Controller("admin/configurator/slot")
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorSlotController {
  constructor(
    private readonly adminConfiguratorSlotService: AdminConfiguratorSlotService,
  ) {}

  @Post("add")
  @ApiOperation({ summary: 'Добавить слот конфигуратора' })
  @LogAction("configurator_slot_add", "cnf_slots")
  create(@Body() data: CreateSlotRequestDto) {
    return this.adminConfiguratorSlotService.create(data);
  }

  @Post(":id/update")
  @ApiOperation({ summary: 'Обновить слот конфигуратора' })
  @LogAction("configurator_slot_update", "cnf_slots")
  updateSlot(@Param("id") id: string, @Body() data: CreateSlotRequestDto) {
    return this.adminConfiguratorSlotService.updateSlot(id, data);
  }

  @Post(":id/delete")
  @ApiOperation({ summary: 'Удалить слот конфигуратора' })
  @LogAction("configurator_slot_delete", "cnf_slots")
  deleteSlot(@Param("id") id: string) {
    return this.adminConfiguratorSlotService.deleteSlot(id);
  }
}
