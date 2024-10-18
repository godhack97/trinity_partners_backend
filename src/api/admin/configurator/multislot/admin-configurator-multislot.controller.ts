import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AdminConfiguratorMultislotService } from "./admin-configurator-multislot.service";
import { Roles } from "../../../../decorators/Roles";
import { RoleTypes } from "../../../../types/RoleTypes";
import { CreateMultislotRequestDto } from "./dto/request/create-multislot.request.dto";
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
  createMultislot(@Body() data: CreateMultislotRequestDto) {
    return this.adminConfiguratorMultislotService.createMultislot(data);
  }

  @Post(':id/delete')
  deleteMultislot(@Param('id') id: string) {
    return this.adminConfiguratorMultislotService.deleteMultislot(id);
  }
}