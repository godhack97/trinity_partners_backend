import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import AdminPartnerService from "./admin-partner.service";
import { Roles } from "../../../decorators/Roles";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RoleTypes } from "../../../types/RoleTypes";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";
import { LogAction } from 'src/logs/log-action.decorator';


@ApiTags("admin/partner")
@ApiBearerAuth()
@Controller("admin/partner")
@Roles([RoleTypes.SuperAdmin])
export class AdminPartnerController {
  constructor(private readonly adminPartnerService: AdminPartnerService) {}

  @Get()
  getAll(@Query() filters: PartnerFilterRequestDto) {
    return this.adminPartnerService.getAll( filters );
  }

  @Post(':id/accept')
  @LogAction('partner_accept', 'companies')
  acceptPartner(@Param('id') id: number) {
    return this.adminPartnerService.accept(id);
  }

  @Post(':id/reject')
  @LogAction('partner_reject', 'companies')
  rejectPartner(@Param('id') id: number) {
    return this.adminPartnerService.reject(id);
  }
}
