import { Controller, Body, Patch, Param } from "@nestjs/common";
import { AdminDealService } from "./admin-deal.service";
import { UpdateDealDto } from "./dto/request/update-deals.dto";
import { RoleTypes } from "@app/types/RoleTypes";
import { Roles } from "@decorators/Roles";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { LogAction } from "src/logs/log-action.decorator";
import { AuthUser } from "@decorators/auth-user";
import { UserEntity } from "@orm/entities";
import { StrictRoles } from "@decorators/StrictRoles";

@ApiTags("deals")
@ApiBearerAuth()
@Controller("admin/deals")
@Roles([RoleTypes.SuperAdmin])
export class AdminDealController {
  constructor(private readonly dealsService: AdminDealService) {}

  @Patch(":id/accept-deal")
  @StrictRoles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @LogAction("deal_update", "deals")
  @ApiOperation({ summary: 'Принять заявку от партнёра' })
  acceptDeal(
    @Param("id") id: string,
    @Body() updateDealDto: UpdateDealDto,
    @AuthUser() authUser: UserEntity,
  ) {
    return this.dealsService.update(+id, updateDealDto, authUser);
  }

}
