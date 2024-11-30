import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminConfiguratorProcessorGenerationService } from './admin-configurator-processor-generation.service';
import { AddProcessorGenerationRequestDto } from './dto/request/add-processor-generation.request.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Roles } from '@decorators/Roles';
import { RoleTypes } from '@app/types/RoleTypes';

@Controller('admin/configurator/processorGeneration')
@ApiTags('admin/configurator/processorGeneration')
@ApiBearerAuth()
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorProcessorGenerationController {
  constructor(private readonly adminConfiguratorProcessorGenerationService: AdminConfiguratorProcessorGenerationService) {}

  @Post()
  @ApiBody({ type: () => AddProcessorGenerationRequestDto })
  addProcessorGeneration(@Body() addProcessorGenerationDto: AddProcessorGenerationRequestDto) {
    return this.adminConfiguratorProcessorGenerationService.addProcessorGeneration(addProcessorGenerationDto);
  }

  @Patch(':id')
  @ApiBody({ type: () => AddProcessorGenerationRequestDto })
  updateProcessorGeneration(@Param('id') id: string, @Body() updateProcessorGenerationDto: AddProcessorGenerationRequestDto) {
    return this.adminConfiguratorProcessorGenerationService.updateProcessorGeneration(id, updateProcessorGenerationDto);
  }

  @Delete(':id')
  removeProcessorGeneration(@Param('id') id: string) {
    return this.adminConfiguratorProcessorGenerationService.removeProcessorGeneration(id);
  }
}
