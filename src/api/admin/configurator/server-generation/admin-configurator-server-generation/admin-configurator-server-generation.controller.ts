import { Controller, Post, Body, Patch, Param, Delete } from "@nestjs/common";
import { AdminConfiguratorServerGenerationService } from "./admin-configurator-server-generation.service";
import { ApiBearerAuth, ApiBody, ApiTags } from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { AddServerGenerationRequestDto } from "./dto/request/add-server-generation.request.dto";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("admin/configurator/serverGeneration")
@ApiBearerAuth()
@Controller("admin/configurator/serverGeneration")
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorServerGenerationController {
  constructor(
    private readonly adminConfiguratorServerGenerationService: AdminConfiguratorServerGenerationService,
  ) {}

  @Post()
  @LogAction("configurator_serverGeneration_add", "cnf_server_generation")
  @ApiBody({ type: () => AddServerGenerationRequestDto })
  addServerGeneration(
    @Body() addServerGenerationDto: AddServerGenerationRequestDto,
  ) {
    return this.adminConfiguratorServerGenerationService.addServerGeneration(
      addServerGenerationDto,
    );
  }

  @Patch(":id")
  @LogAction("configurator_serverGeneration_update", "cnf_server_generation")
  @ApiBody({ type: () => AddServerGenerationRequestDto })
  updateServerGeneration(
    @Param("id") id: string,
    @Body() updateServerGenerationDto: AddServerGenerationRequestDto,
  ) {
    return this.adminConfiguratorServerGenerationService.updateServerGeneration(
      id,
      updateServerGenerationDto,
    );
  }

  @Delete(":id")
  @LogAction("configurator_serverGeneration_delete", "cnf_server_generation")
  removeServerGeneration(@Param("id") id: string) {
    return this.adminConfiguratorServerGenerationService.removeServerGeneration(
      id,
    );
  }
}
