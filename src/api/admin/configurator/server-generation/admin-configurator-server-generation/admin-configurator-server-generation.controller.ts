import { Controller, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminConfiguratorServerGenerationService } from './admin-configurator-server-generation.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@decorators/Roles';
import { RoleTypes } from '@app/types/RoleTypes';
import { AddServerGenerationRequestDto } from './dto/request/add-server-generation.request.dto';

@ApiTags("admin/configurator/serverGeneration")
@ApiBearerAuth()
@Controller('admin/configurator/serverGeneration')
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerGenerationController {
  constructor(private readonly adminConfiguratorServerGenerationService: AdminConfiguratorServerGenerationService) {}

  @Post()
  addServerGeneration(@Body() addServerGenerationDto: AddServerGenerationRequestDto) {
    return this.adminConfiguratorServerGenerationService.addServerGeneration(addServerGenerationDto);
  }

  @Patch(':id')
  updateServerGeneration(@Param('id') id: string, @Body() updateServerGenerationDto: AddServerGenerationRequestDto) {
    console.log(id)
    return this.adminConfiguratorServerGenerationService.updateServerGeneration(id, updateServerGenerationDto);
  }

  @Delete(':id')
  removeServerGeneration(@Param('id') id: string) {
    return this.adminConfiguratorServerGenerationService.removeServerGeneration(id);
  }
}
