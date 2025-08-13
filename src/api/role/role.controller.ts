import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RoleResponseDto } from "./dto/response/role.response.dto";
import { RoleService } from "./role.service";

@ApiTags("role")
@ApiBearerAuth()
@Controller("role")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiResponse({ type: [RoleResponseDto] })
  findAll() {
    return this.roleService.findAll();
  }

  @Get(":id")
  @ApiResponse({ type: RoleResponseDto })
  findOne(@Param("id") id: string) {
    return this.roleService.findOne(+id);
  }
}
