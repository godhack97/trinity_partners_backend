import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiResponse, ApiOperation } from "@nestjs/swagger";
import { ConfiguratorService } from "./configurator.service";
import { SearchComponentsDto } from "./dto/request/search-components.request.dto";
import { CreateComponentTypeDto } from "./dto/request/create-component-type.dto";
import { UpdateComponentTypeDto } from "./dto/request/update-component-type.dto";

@ApiTags("configurator")
@Controller("configurator")
@ApiBearerAuth()
export class ConfiguratorController {
  constructor(private readonly configuratorService: ConfiguratorService) {}

  // Эндпоинты для подсчета
  @Get("serverHeight/count")
  @ApiOperation({ summary: "Получить количество высот серверов" })
  @ApiResponse({ type: Number })
  async getServerboxCount() {
    return this.configuratorService.getServerboxCount();
  }

  @Get("slot/count")
  @ApiOperation({ summary: "Получить количество слотов" })
  @ApiResponse({ type: Number })
  async getSlotsCount() {
    return this.configuratorService.getSlotsCount();
  }

  @Get("serverGeneration/count")
  @ApiOperation({ summary: "Получить количество поколений серверов" })
  @ApiResponse({ type: Number })
  async getServerGenerationsCount() {
    return this.configuratorService.getServerGenerationsCount();
  }

  @Get("server/count")
  @ApiOperation({ summary: "Получить количество серверов" })
  @ApiResponse({ type: Number })
  async getServersCount() {
    return this.configuratorService.getServersCount();
  }

  @Get("processorGeneration/count")
  @ApiOperation({ summary: "Получить количество поколений процессоров" })
  @ApiResponse({ type: Number })
  async getProcessorGenerationsCount() {
    return this.configuratorService.getProcessorGenerationsCount();
  }

  @Get("component/count")
  @ApiResponse({ type: Number })
  @ApiOperation({ summary: "Получить количество компонентов" })
  async getComponentsCount() {
    return this.configuratorService.getComponentsCount();
  }

  // Существующие эндпоинты
  @Get("serverHeight")
  @ApiOperation({ summary: "Получить все высоты серверов" })
  serverHeight() {
    return this.configuratorService.serverHeight();
  }

  @Get("serverGeneration")
  @ApiOperation({ summary: "Получить все поколения серверов" })
  serverGeneration() {
    return this.configuratorService.serverGeneration();
  }

  @Get("processorGeneration")
  @ApiOperation({ summary: "Получить все поколения процессоров" })
  processorGeneration() {
    return this.configuratorService.processorGeneration();
  }

  @Get("slot")
  @ApiOperation({ summary: "Получить все слоты" })
  getSlot() {
    return this.configuratorService.getSlots();
  }

  @Get("slotsAndMultislots")
  @ApiOperation({ summary: "Получить все слоты и мультислоты" })
  getSlotsAndMultislots() {
    return this.configuratorService.getSlotsAndMultislots();
  }

  @Get("server")
  @ApiOperation({ summary: "Получить все сервера" })
  getServers() {
    return this.configuratorService.getServers();
  }

  @Get("componentType/:id")
  @ApiOperation({ summary: "Получить тип компонента по id" })
  getComponentType(@Param("id") id: string) {
    return this.configuratorService.getComponentType(id);
  }

  @Get("componentType")
  @ApiOperation({ summary: "Получить все типы компонентов" })
  getComponentTypes() {
    return this.configuratorService.getComponentTypes();
  }


  @Post("componentType")
  @ApiOperation({ summary: "Создать новый тип компонента" })
  createComponentType(@Body() dto: CreateComponentTypeDto) {
    return this.configuratorService.createComponentType(dto);
  }

  @Patch("componentType/:id")
  @ApiOperation({ summary: "Обновить тип компонента" })
  updateComponentType(@Param("id") id: string, @Body() dto: UpdateComponentTypeDto) {
    return this.configuratorService.updateComponentType(id, dto);
  }

  @Delete("componentType/:id")
  @ApiOperation({ summary: "Удалить тип компонента" })
  deleteComponentType(@Param("id") id: string) {
    return this.configuratorService.deleteComponentType(id);
  }

  @Get("component")
  @ApiOperation({ summary: "Получить все компоненты" })
  getComponents(@Query() entry?: SearchComponentsDto) {
    return this.configuratorService.getComponents(entry);
  }

  @Get("component/:id")
  @ApiOperation({ summary: "Получить компонент по id" })
  getComponent(@Param("id") id: string) {
    return this.configuratorService.getComponent(id);
  }
}