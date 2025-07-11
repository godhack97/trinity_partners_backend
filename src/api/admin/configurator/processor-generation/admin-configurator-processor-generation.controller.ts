import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminConfiguratorProcessorGenerationService } from './admin-configurator-processor-generation.service';
import { AddProcessorGenerationRequestDto } from './dto/request/add-processor-generation.request.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Roles } from '@decorators/Roles';
import { RoleTypes } from '@app/types/RoleTypes';
import { LogAction } from 'src/logs/log-action.decorator';

@Controller('admin/configurator/processorGeneration')
@ApiTags('admin/configurator/processorGeneration')
@ApiBearerAuth()
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorProcessorGenerationController {
  constructor(private readonly adminConfiguratorProcessorGenerationService: AdminConfiguratorProcessorGenerationService) {}

  @Post()
  @LogAction('configurator_processorGeneration_add', 'cnf_processor_generation')
  @ApiBody({ type: () => AddProcessorGenerationRequestDto })
  addProcessorGeneration(@Body() addProcessorGenerationDto: AddProcessorGenerationRequestDto) {
    return this.adminConfiguratorProcessorGenerationService.addProcessorGeneration(addProcessorGenerationDto);
  }

  @Patch(':id')
  @LogAction('configurator_processorGeneration_update', 'cnf_processor_generation')
  @ApiBody({ type: () => AddProcessorGenerationRequestDto })
  updateProcessorGeneration(@Param('id') id: string, @Body() updateProcessorGenerationDto: AddProcessorGenerationRequestDto) {
    return this.adminConfiguratorProcessorGenerationService.updateProcessorGeneration(id, updateProcessorGenerationDto);
  }

  @Delete(':id')
  @LogAction('configurator_processorGeneration_delete', 'cnf_processor_generation')
  removeProcessorGeneration(@Param('id') id: string) {
    return this.adminConfiguratorProcessorGenerationService.removeProcessorGeneration(id);
  }
}
