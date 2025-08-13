import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiResponse } from "@nestjs/swagger";
import { ConfiguratorService } from "./configurator.service";
import { SearchComponentsDto } from "./dto/request/search-components.request.dto";

@ApiTags("configurator")
@Controller("configurator")
@ApiBearerAuth()
export class ConfiguratorController {
  constructor(private readonly configuratorService: ConfiguratorService) {}

  // Эндпоинты для подсчета
  @Get("serverHeight/count")
  @ApiResponse({ type: Number })
  async getServerboxCount() {
    return this.configuratorService.getServerboxCount();
  }

  @Get("slot/count")
  @ApiResponse({ type: Number })
  async getSlotsCount() {
    return this.configuratorService.getSlotsCount();
  }

  @Get("serverGeneration/count")
  @ApiResponse({ type: Number })
  async getServerGenerationsCount() {
    return this.configuratorService.getServerGenerationsCount();
  }

  @Get("server/count")
  @ApiResponse({ type: Number })
  async getServersCount() {
    return this.configuratorService.getServersCount();
  }

  @Get("processorGeneration/count")
  @ApiResponse({ type: Number })
  async getProcessorGenerationsCount() {
    return this.configuratorService.getProcessorGenerationsCount();
  }

  @Get("component/count")
  @ApiResponse({ type: Number })
  async getComponentsCount() {
    return this.configuratorService.getComponentsCount();
  }

  // Существующие эндпоинты
  @Get("serverHeight")
  serverHeight() {
    return this.configuratorService.serverHeight();
  }

  @Get("serverGeneration")
  serverGeneration() {
    return this.configuratorService.serverGeneration();
  }

  @Get("processorGeneration")
  processorGeneration() {
    return this.configuratorService.processorGeneration();
  }

  @Get("slot")
  getSlot() {
    return this.configuratorService.getSlots();
  }

  @Get("slotsAndMultislots")
  getSlotsAndMultislots() {
    return this.configuratorService.getSlotsAndMultislots();
  }

  @Get("server")
  getServers() {
    return this.configuratorService.getServers();
  }

  @Get("componentType")
  getComponentTypes() {
    return this.configuratorService.getComponentTypes();
  }

  @Get("component")
  getComponents(@Query() entry?: SearchComponentsDto) {
    return this.configuratorService.getComponents(entry);
  }

  @Get("component/:id")
  getComponent(@Param("id") id: string) {
    return this.configuratorService.getComponent(id);
  }
}
