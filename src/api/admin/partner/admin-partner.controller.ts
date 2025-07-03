import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import AdminPartnerService from "./admin-partner.service";
import { Roles } from "../../../decorators/Roles";
import { ApiBearerAuth, ApiTags, ApiResponse } from "@nestjs/swagger";
import { RoleTypes } from "../../../types/RoleTypes";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";
import { LogAction } from 'src/logs/log-action.decorator';
import { CompanyStatus } from "@orm/entities";

@ApiTags("admin/partner")
@ApiBearerAuth()
@Controller("admin/partner")
@Roles([RoleTypes.SuperAdmin])
export class AdminPartnerController {
 constructor(private readonly adminPartnerService: AdminPartnerService) {}

 @Get('/count')
 @ApiBearerAuth()
 @ApiResponse({ type: Number })
 async getCount() {
   return this.adminPartnerService.getCount();
 }

 @Get('/count/pending')
 @ApiBearerAuth()
 @ApiResponse({ type: Number })
 async getPendingCount() {
   return this.adminPartnerService.getCountByStatus(CompanyStatus.Pending);
 }

 @Get('/count/accepted')
 @ApiBearerAuth()
 @ApiResponse({ type: Number })
 async getAcceptedCount() {
   return this.adminPartnerService.getCountByStatus(CompanyStatus.Accept);
 }

 @Get('/count/rejected')
 @ApiBearerAuth()
 @ApiResponse({ type: Number })
 async getRejectedCount() {
   return this.adminPartnerService.getCountByStatus(CompanyStatus.Reject);
 }

 @Get()
 @ApiBearerAuth()
 getAll(@Query() filters: PartnerFilterRequestDto) {
   return this.adminPartnerService.getAll(filters);
 }

 @Post(':id/accept')
 @ApiBearerAuth()
 @LogAction('partner_accept', 'companies')
 acceptPartner(@Param('id') id: number) {
   return this.adminPartnerService.accept(id);
 }

 @Post(':id/reject')
 @ApiBearerAuth()
 @LogAction('partner_reject', 'companies')
 rejectPartner(@Param('id') id: number) {
   return this.adminPartnerService.reject(id);
 }
}