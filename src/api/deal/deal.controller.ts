import { AuthUser } from "@decorators/auth-user";
import { Controller, Get, Post, Body, Param, UseInterceptors, Req, Query, UseGuards, UploadedFile, BadRequestException } from '@nestjs/common';
import { UserEntity } from "@orm/entities";
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransformResponse } from '@interceptors/transform-response.interceptor';
import { DealResponseDto } from './dto/response/deal-response.dto';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';
import { CheckUserOrCompanyStatusGuard } from '@app/guards/check-user-or-company-status.guard';
import { LogAction } from 'src/logs/log-action.decorator';

@ApiTags('deal')
@ApiBearerAuth()
@UseGuards(CheckUserOrCompanyStatusGuard)
@Controller('deal')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  @LogAction('deal_add')
  @ApiBody({ type: () => CreateDealDto })
  create(@AuthUser() auth_user: UserEntity, @Body() createDealDto: CreateDealDto) {
    return this.dealService.create(auth_user, createDealDto);
  }

  @Get()
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto, isArray: true })
  findAll(@AuthUser() auth_user: UserEntity, @Query() entry?: SearchDealDto) {
    return this.dealService.findAll(auth_user, entry);
  }

  @Get('statistic')
  //@UseInterceptors(new TransformResponse(DealStatisticsResponseDto))
  @ApiResponse({ type: DealStatisticsResponseDto })
  getDealStatistic(@AuthUser() auth_user: UserEntity): Promise<DealStatisticsResponseDto> {
    return this.dealService.getDealStatistic(auth_user);
  }

  @Get(':id')
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto })
  findOne(@Param('id') id: string, @AuthUser() auth_user: UserEntity) {
    return this.dealService.findOne(+id, auth_user);
  }
}
