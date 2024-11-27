import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DealsService } from './deals.service';
import { UpdateDealDto } from './dto/request/update-deals.dto';
import { RoleTypes } from '@app/types/RoleTypes';
import { Roles } from '@decorators/Roles';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags("admin/deals")
@ApiBearerAuth()
@Controller("admin/deals")
@Roles([RoleTypes.SuperAdmin])
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  
  @Patch(':id/accept-deal')
  acceptDeal(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealsService.update(+id, updateDealDto);
  }

}
