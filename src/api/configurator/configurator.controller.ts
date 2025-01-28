import {
  Controller,
  Get, Param,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ConfiguratorService } from './configurator.service';
import { SearchComponentsDto } from "./dto/request/search-components.request.dto";

@ApiTags('configurator')
@Controller('configurator')
@ApiBearerAuth()
export class ConfiguratorController {
  constructor(private readonly configuratorService: ConfiguratorService) {}

  @Get('serverHeight')
  serverHeight() {
    return this.configuratorService.serverHeight()
  }

  @Get('serverGeneration')
  serverGeneration() {
    return this.configuratorService.serverGeneration()
  }

  @Get('processorGeneration')
  processorGeneration() {
    return this.configuratorService.processorGeneration()
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
  getComponents( @Query() entry?: SearchComponentsDto ) {
    return this.configuratorService.getComponents( entry )
  }

  @Get("component/:id")
  getComponent(@Param("id") id: string) {
    return this.configuratorService.getComponent(id)
  }
}
