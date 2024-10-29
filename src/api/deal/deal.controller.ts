import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors } from '@nestjs/common';
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { UpdateDealDto } from './dto/request/update-deal.dto';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransformResponse } from '@interceptors/transform-response.interceptor';
import { DealResponseDto } from './dto/response/deal-response.dto';

@ApiTags('deal')
@ApiBearerAuth()
@Controller('deal')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  @ApiBody({ type: () => CreateDealDto })
  create(@Body() createDealDto: CreateDealDto) {
    return this.dealService.create(createDealDto);
  }

  @Get()
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto })
  findAll() {
    return this.dealService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealService.update(+id, updateDealDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dealService.remove(+id);
  }
}
