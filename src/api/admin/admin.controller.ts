import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { Roles } from "../../decorators/Roles";
import { RoleTypes } from "../../types/RoleTypes";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@Roles([RoleTypes.SuperAdmin])
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  adminhello() {
    return "Hello AdminController";
  }
}
