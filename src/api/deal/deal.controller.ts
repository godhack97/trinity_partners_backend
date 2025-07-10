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
import { Delete } from '@nestjs/common';

@ApiTags('deal')
@ApiBearerAuth()
@UseGuards(CheckUserOrCompanyStatusGuard)
@Controller('deal')
export class DealController {
  constructor(
    private readonly dealService: DealService
  ) { }

  @Get('/count')
  @ApiResponse({ type: Number })
  async getCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getCount();
  }

  @Get('/count/all')
  @ApiResponse({ type: Number })
  async getAllCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getAllCount();
  }

  @Get('/count/moderation')
  @ApiResponse({ type: Number })
  async getModerationCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getModerationCount();
  }

  @Get('/count/registered')
  @ApiResponse({ type: Number })
  async getRegisteredCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getRegisteredCount();
  }

  @Get('/count/canceled')
  @ApiResponse({ type: Number })
  async getCanceledCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getCanceledCount();
  }

  @Get('/count/win')
  @ApiResponse({ type: Number })
  async getWinCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getWinCount();
  }

  @Get('/count/loose')
  @ApiResponse({ type: Number })
  async getLooseCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getLooseCount();
  }

  @Post()
  @LogAction('deal_add', 'deals')
  @ApiBody({ type: () => CreateDealDto })
  create(@AuthUser() auth_user: UserEntity, @Body() createDealDto: CreateDealDto) {
    return this.dealService.create(auth_user, createDealDto);
  }

  @Get('bitrix24/test')
  @ApiResponse({
    description: 'Проверка подключения к Bitrix24',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })

  async testBitrix24Connection() {
    const isConnected = await this.dealService.checkBitrix24Connection();

    console.log(isConnected);
    return {
      connected: isConnected,
      message: isConnected
        ? 'Подключение к Bitrix24 работает корректно'
        : 'Ошибка подключения к Bitrix24. Проверьте настройки BITRIX24_WEBHOOK_URL'
    };
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

  @Delete(':id')
  @LogAction('deal_delete', 'deals')
  @ApiResponse({
    description: 'Сделка успешно удалена',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  async remove(@Param('id') id: string, @AuthUser() auth_user: UserEntity) {
    await this.dealService.remove(+id, auth_user);
    return { message: 'Сделка успешно удалена' };
  }
}
