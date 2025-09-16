import { AuthUser } from "@decorators/auth-user";
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  Req,
  Query,
  UseGuards,
  UploadedFile,
  BadRequestException,
  Put,
} from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { DealService } from "./deal.service";
import { CreateDealDto } from "./dto/request/create-deal.dto";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { DealResponseDto } from "./dto/response/deal-response.dto";
import { SearchDealDto } from "./dto/request/search-deal.dto";
import { DealStatisticsResponseDto } from "./dto/response/deal-statistics-response.dto";
import { CheckUserOrCompanyStatusGuard } from "@app/guards/check-user-or-company-status.guard";
import { AuthGuard } from "@app/guards/auth.guard";
import { PermissionsGuard } from "@app/guards/permissions.guard";
import { RequirePermissions } from "@decorators/permissions.decorator";
import { LogAction } from "src/logs/log-action.decorator";
import { Delete } from "@nestjs/common";
import { CreateDealDeletionRequestDto } from "./dto/request/create-deal-deletion-request.dto";
import { ProcessDealDeletionRequestDto } from "./dto/request/process-deal-deletion-request.dto";
import { DealDeletionRequestResponseDto } from "./dto/response/deal-deletion-request-response.dto";

@ApiTags("deal")
@ApiBearerAuth()
@UseGuards(CheckUserOrCompanyStatusGuard, AuthGuard, PermissionsGuard)
@Controller("deal")
export class DealController {
  constructor(private readonly dealService: DealService) {}

  // Все методы получения количества - требуют права на чтение сделок
  @Get("/count")
  @ApiResponse({ type: Number })
  async getCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getCount();
  }

  @Get("/count/all")
  @ApiResponse({ type: Number })
  async getAllCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getAllCount();
  }

  @Get("/count/moderation")
  @ApiResponse({ type: Number })
  async getModerationCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getModerationCount();
  }

  @Get("/count/registered")
  @ApiResponse({ type: Number })
  async getRegisteredCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getRegisteredCount();
  }

  @Get("/count/canceled")
  @ApiResponse({ type: Number })
  async getCanceledCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getCanceledCount();
  }

  @Get("/count/win")
  @ApiResponse({ type: Number })
  async getWinCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getWinCount();
  }

  @Get("/count/loose")
  @ApiResponse({ type: Number })
  async getLooseCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getLooseCount();
  }

  // Создание сделки - требует права на создание
  @Post()
  @RequirePermissions('api.deals.write')
  @LogAction("deal_add", "deals")
  @ApiBody({ type: () => CreateDealDto })
  create(
    @AuthUser() auth_user: UserEntity,
    @Body() createDealDto: CreateDealDto,
  ) {
    return this.dealService.create(auth_user, createDealDto);
  }

  // Тестирование интеграции Bitrix24
  @Get("bitrix24/test")
  @RequirePermissions('system.integrations.write')
  @ApiResponse({
    description: "Проверка подключения к Bitrix24",
    schema: {
      type: "object",
      properties: {
        connected: { type: "boolean" },
        message: { type: "string" },
      },
    },
  })

  async testBitrix24Connection() {
    const isConnected = await this.dealService.checkBitrix24Connection();

    console.log(isConnected);
    return {
      connected: isConnected,
      message: isConnected
        ? "Подключение к Bitrix24 работает корректно"
        : "Ошибка подключения к Bitrix24. Проверьте настройки BITRIX24_WEBHOOK_URL",
    };
  }

  // Получение всех сделок - требует права на чтение
  @Get()
  @RequirePermissions('api.deals.read')
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto, isArray: true })
  findAll(@AuthUser() auth_user: UserEntity, @Query() entry?: SearchDealDto) {
    return this.dealService.findAll(auth_user, entry);
  }

  // Получение статистики - требует права на чтение
  @Get("statistic")
  @RequirePermissions('api.deals.read')
  @ApiResponse({ type: DealStatisticsResponseDto })
  getDealStatistic(
    @AuthUser() auth_user: UserEntity,
  ): Promise<DealStatisticsResponseDto> {
    return this.dealService.getDealStatistic(auth_user);
  }

  // Заявки на удаление - требует права на чтение
  @Get("deletion-requests")
  @RequirePermissions('api.deals.read')
  @ApiResponse({
    description: "Список заявок на удаление",
    type: DealDeletionRequestResponseDto,
    isArray: true,
  })
  async getDeletionRequests(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getDeletionRequests(auth_user);
  }

  // Ожидающие заявки на удаление - чтение
  @Get("deletion-requests/pending")
  @RequirePermissions('api.deals.read')
  @ApiResponse({
    description: "Список ожидающих заявок на удаление (только для админов)",
    type: DealDeletionRequestResponseDto,
    isArray: true,
  })
  async getPendingDeletionRequests(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getPendingDeletionRequests(auth_user);
  }

  // Создание заявки на удаление - не требует прав, это делают партнеры
  @Post(":id/deletion-request")
  @ApiBody({ type: CreateDealDeletionRequestDto })
  @ApiResponse({
    description: "Заявка на удаление создана",
    type: DealDeletionRequestResponseDto,
  })

  async createDeletionRequest(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() createDeletionRequestDto: CreateDealDeletionRequestDto,
  ) {
    return this.dealService.createDeletionRequest(
      +id,
      auth_user,
      createDeletionRequestDto,
    );
  }

  // Обработка заявки на удаление - только для админов/модераторов - запись
  @Put("deletion-requests/:requestId/process")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_deletion_request_process", "deal_deletion_requests")
  @ApiBody({ type: ProcessDealDeletionRequestDto })
  @ApiResponse({
    description: "Заявка на удаление обработана",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  })
  async processDeletionRequest(
    @Param("requestId") requestId: string,
    @AuthUser() auth_user: UserEntity,
    @Body() processDto: ProcessDealDeletionRequestDto,
  ) {
    return this.dealService.processDeletionRequest(
      +requestId,
      auth_user,
      processDto,
    );
  }

  // Получение конкретной сделки - требует права на чтение
  @Get(":id")
  @RequirePermissions('api.deals.read')
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto })
  findOne(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    return this.dealService.findOne(+id, auth_user);
  }

  // Удаление сделки - требует права на удаление
  @Delete(":id")
  @RequirePermissions('api.deals.remove')
  @LogAction("deal_delete", "deals")
  @ApiResponse({
    description: "Сделка успешно удалена",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  })
  async remove(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    await this.dealService.remove(+id, auth_user);
    return { message: "Сделка успешно удалена" };
  }
}
