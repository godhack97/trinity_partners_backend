import { Controller,  Body, Patch, Param } from '@nestjs/common';
import { AdminDealService } from './admin-deal.service';
import { UpdateDealDto } from './dto/request/update-deals.dto';
import { RoleTypes } from '@app/types/RoleTypes';
import { Roles } from '@decorators/Roles';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags("admin/deals")
@ApiBearerAuth()
@Controller("admin/deals")
@Roles([RoleTypes.SuperAdmin])
export class AdminDealController {
  constructor(private readonly dealsService: AdminDealService) {}

  
  @Patch(':id/accept-deal')
  acceptDeal(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealsService.update(+id, updateDealDto);
  }

}
