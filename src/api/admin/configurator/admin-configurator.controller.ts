import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Controller } from "@nestjs/common";
import { Roles } from "../../../decorators/Roles";
import { RoleTypes } from "../../../types/RoleTypes";

@ApiTags("admin/configurator")
@ApiBearerAuth()
@Controller("admin/configurator")
@Roles([RoleTypes.SuperAdmin])
export class AdminConfiguratorController {}
