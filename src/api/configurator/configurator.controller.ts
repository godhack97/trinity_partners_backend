import {
  Controller,
  Get, Param
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfiguratorService } from './configurator.service';

@ApiTags('configurator')
@Controller('configurator')
@ApiBearerAuth()
export class ConfiguratorController {
  constructor(private readonly configuratorService: ConfiguratorService) {}

  @Get('serverHeight')
  serverHeight() {
    return this.configuratorService.serverHeight()
  }

  @Get('slot')
  getSlot() {
    return this.configuratorService.getSlots()
  }

  @Get('slotsAndMultislots')
  getSlotsAndMultislots() {
    return this.configuratorService.getSlotsAndMultislots()
  }

  @Get('server')
  getServers() {
    return this.configuratorService.getServers()
  }

  @Get('componentType')
  getComponentTypes() {
    return this.configuratorService.getComponentTypes()
  }

  @Get('component')
  getComponents() {
    return this.configuratorService.getComponents()
  }

  @Get("component/:id")
  getComponent(@Param("id") id: string) {
    return this.configuratorService.getComponent(id)
  }
}
