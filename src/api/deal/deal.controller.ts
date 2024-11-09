import { Controller, Get, Post, Body, Param, UseInterceptors, Req, Query, UseGuards } from '@nestjs/common';
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransformResponse } from '@interceptors/transform-response.interceptor';
import { DealResponseDto } from './dto/response/deal-response.dto';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';
import { CheckUserOrCompanyStatusGuard } from '@app/guards/check-user-or-company-status.guard';

@ApiTags('deal')
@ApiBearerAuth()
@UseGuards(CheckUserOrCompanyStatusGuard)
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
}
