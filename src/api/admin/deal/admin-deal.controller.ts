import { Controller, Body, Patch, Param } from "@nestjs/common";
import { AdminDealService } from "./admin-deal.service";
import { UpdateDealDto } from "./dto/request/update-deals.dto";
import { RoleTypes } from "@app/types/RoleTypes";
import { Roles } from "@decorators/Roles";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("deals")
@ApiBearerAuth()
@Controller("admin/deals")
@Roles([RoleTypes.SuperAdmin])
export class AdminDealController {
  constructor(private readonly dealsService: AdminDealService) {}

  @Patch(":id/accept-deal")
  @LogAction("deal_update", "deals")
  @ApiOperation({ summary: 'Принять заявку от партнёра' })
  acceptDeal(@Param("id") id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealsService.update(+id, updateDealDto);
  }
}
