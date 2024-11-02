import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, Req, Query } from '@nestjs/common';
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { UpdateDealDto } from './dto/request/update-deal.dto';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransformResponse } from '@interceptors/transform-response.interceptor';
import { DealResponseDto } from './dto/response/deal-response.dto';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';

@ApiTags('deal')
@ApiBearerAuth()
@Controller('deal')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  @ApiBody({ type: () => CreateDealDto })
  create(@Req() request: Request, @Body() createDealDto: CreateDealDto) {
    return this.dealService.create(request, createDealDto);
  }

  @Get()
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto, isArray: true })
  findAll(@Req() request: Request, @Query() entry?: SearchDealDto) {
    return this.dealService.findAll(request, entry);
  }

  @Get('statistic')
  @UseInterceptors(new TransformResponse(DealStatisticsResponseDto))
  @ApiResponse({ type: DealResponseDto })
  getDealStatistic(@Req() request: Request): Promise<DealStatisticsResponseDto> {
    return this.dealService.getDealStatistic(request);
  }

  @Get(':id')
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto })
  findOne(@Param('id') id: string, @Req() request: Request) {
    return this.dealService.findOne(+id, request);
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
