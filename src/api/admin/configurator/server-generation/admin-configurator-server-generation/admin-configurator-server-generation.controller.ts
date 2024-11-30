import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminConfiguratorServerGenerationService } from './admin-configurator-server-generation.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Roles } from '@decorators/Roles';
import { RoleTypes } from '@app/types/RoleTypes';
import { AddServerGenerationRequestDto } from './dto/request/add-server-generation.request.dto';

@ApiTags('admin/configurator/serverGeneration')
@ApiBearerAuth()
@Controller('admin/configurator/serverGeneration')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerGenerationController {
  constructor(private readonly adminConfiguratorServerGenerationService: AdminConfiguratorServerGenerationService) {}

  @Post()
  @ApiBody({ type: () => AddServerGenerationRequestDto })
  addServerGeneration(@Body() addServerGenerationDto: AddServerGenerationRequestDto) {
    return this.adminConfiguratorServerGenerationService.addServerGeneration(addServerGenerationDto);
  }

  @Patch(':id')
  @ApiBody({ type: () => AddServerGenerationRequestDto })
  updateServerGeneration(@Param('id') id: string, @Body() updateServerGenerationDto: AddServerGenerationRequestDto) {
    return this.adminConfiguratorServerGenerationService.updateServerGeneration(id, updateServerGenerationDto);
  }

  @Delete(':id')
  removeServerGeneration(@Param('id') id: string) {
    return this.adminConfiguratorServerGenerationService.removeServerGeneration(id);
  }
}
