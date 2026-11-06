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
  ValidationPipe,
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
import { UpdateDealStatusDto } from "./dto/request/update-deal-status.dto";
import { AddDealConfigurationsDto } from "./dto/request/add-deal-configurations.dto";
import { UpdateDealDto } from "./dto/request/update-deal.dto";
import { AddDealAttachmentDto } from "./dto/request/add-deal-attachment.dto";
import { AddDealCommentDto } from "./dto/request/add-deal-comment.dto";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { TransferDealManagerDto } from "./dto/request/transfer-deal-manager.dto";
import { AddDealParticipantDto } from "./dto/request/deal-participant.dto";
import {
  AddDealMessageDto,
  MarkDealChannelReadDto,
} from "./dto/request/deal-message.dto";

const strictDealBodyValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

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
    return this.dealService.getCount(auth_user);
  }

  @Get("/count/all")
  @ApiResponse({ type: Number })
  async getAllCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getAllCount(auth_user);
  }

  @Get("/count/moderation")
  @ApiResponse({ type: Number })
  async getModerationCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getModerationCount(auth_user);
  }

  @Get("/count/registered")
  @ApiResponse({ type: Number })
  async getRegisteredCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getRegisteredCount(auth_user);
  }

  @Get("/count/canceled")
  @ApiResponse({ type: Number })
  async getCanceledCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getCanceledCount(auth_user);
  }

  @Get("/count/win")
  @ApiResponse({ type: Number })
  async getWinCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getWinCount(auth_user);
  }

  @Get("/count/loose")
  @ApiResponse({ type: Number })
  async getLooseCount(@AuthUser() auth_user: UserEntity) {
    return this.dealService.getLooseCount(auth_user);
  }

  // Создание сделки - требует права на создание
  @Post()
  @RequirePermissions('api.deals.write')
  @LogAction("deal_add", "deals")
  @ApiBody({ type: () => CreateDealDto })
  create(
    @AuthUser() auth_user: UserEntity,
    @Body(strictDealBodyValidation) createDealDto: CreateDealDto,
  ) {
    return this.dealService.create(auth_user, createDealDto);
  }

  @Post(":id/submit")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_submit", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto })
  submit(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.submit(+id, auth_user);
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

  @Get("vendor-managers")
  @RequirePermissions("api.deals.read")
  listVendorManagers(@AuthUser() auth_user: UserEntity) {
    return this.dealService.listVendorManagers(auth_user);
  }

  @Put(":id/manager")
  @RequirePermissions("api.deals.write")
  @LogAction("deal_manager_transfer", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  transferManager(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body(strictDealBodyValidation) dto: TransferDealManagerDto,
  ) {
    return this.dealService.transferManager(+id, auth_user, dto);
  }

  @Post(":id/distributor/send")
  @RequirePermissions("api.deals.write")
  @LogAction("deal_distributor_send", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  sendToDistributor(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.sendToDistributor(+id, auth_user);
  }

  @Post(":id/distributor/revoke")
  @RequirePermissions("api.deals.write")
  @LogAction("deal_distributor_revoke", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  revokeDistributor(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.revokeDistributor(+id, auth_user);
  }

  @Get(":id/participants")
  @RequirePermissions("api.deals.read")
  listParticipants(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.listDealParticipants(+id, auth_user);
  }

  @Post(":id/participants")
  @RequirePermissions("api.deals.write")
  @LogAction("deal_participant_add", "deal_participants")
  addParticipant(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body(strictDealBodyValidation) dto: AddDealParticipantDto,
  ) {
    return this.dealService.addDealParticipant(+id, auth_user, dto);
  }

  @Delete(":id/participants/:userId")
  @RequirePermissions("api.deals.write")
  @LogAction("deal_participant_remove", "deal_participants")
  removeParticipant(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.removeDealParticipant(+id, +userId, auth_user);
  }

  @Get(":id/channels")
  @RequirePermissions("api.deals.read")
  listChannels(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.listDealChannels(+id, auth_user);
  }

  @Get(":id/channels/:channelId/messages")
  @RequirePermissions("api.deals.read")
  listMessages(
    @Param("id") id: string,
    @Param("channelId") channelId: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.listDealMessages(+id, +channelId, auth_user);
  }

  @Post(":id/channels/:channelId/messages")
  @RequirePermissions("api.deals.write")
  @LogAction("deal_message_add", "deal_messages")
  addMessage(
    @Param("id") id: string,
    @Param("channelId") channelId: string,
    @AuthUser() auth_user: UserEntity,
    @Body(strictDealBodyValidation) dto: AddDealMessageDto,
  ) {
    return this.dealService.addDealMessage(+id, +channelId, auth_user, dto);
  }

  @Put(":id/channels/:channelId/read")
  @RequirePermissions("api.deals.read")
  markChannelRead(
    @Param("id") id: string,
    @Param("channelId") channelId: string,
    @AuthUser() auth_user: UserEntity,
    @Body(strictDealBodyValidation) dto: MarkDealChannelReadDto,
  ) {
    return this.dealService.markDealChannelRead(
      +id,
      +channelId,
      auth_user,
      dto,
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

  @Put(":id")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_update", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiBody({ type: UpdateDealDto })
  @ApiResponse({ type: DealResponseDto })
  async update(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body(strictDealBodyValidation) updateDealDto: UpdateDealDto,
  ) {
    return this.dealService.update(+id, auth_user, updateDealDto);
  }

  @Put(":id/status")
  @LogAction("deal_update", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiBody({ type: UpdateDealStatusDto })
  @ApiResponse({ type: DealResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() updateDealStatusDto: UpdateDealStatusDto,
  ) {
    return this.dealService.updateDealStatus(
      +id,
      updateDealStatusDto.status,
      auth_user,
      updateDealStatusDto.registration_expires_at,
      updateDealStatusDto.final_deal_sum,
    );
  }

  @Put(":id/configurations")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_update", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiBody({ type: AddDealConfigurationsDto })
  @ApiResponse({ type: DealResponseDto })
  async addConfigurations(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() addDealConfigurationsDto: AddDealConfigurationsDto,
  ) {
    return this.dealService.addConfigurations(
      +id,
      auth_user,
      addDealConfigurationsDto,
    );
  }

  @Delete(":id/configurations/:configurationId")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_update", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiResponse({ type: DealResponseDto })
  async removeConfiguration(
    @Param("id") id: string,
    @Param("configurationId") configurationId: string,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.dealService.removeConfiguration(
      +id,
      configurationId,
      auth_user,
    );
  }

  @Put(":id/configurations/:configurationId")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_update", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiBody({ type: AddDealConfigurationsDto })
  @ApiResponse({ type: DealResponseDto })
  async updateConfiguration(
    @Param("id") id: string,
    @Param("configurationId") configurationId: string,
    @AuthUser() auth_user: UserEntity,
    @Body() addDealConfigurationsDto: AddDealConfigurationsDto,
  ) {
    return this.dealService.updateConfiguration(
      +id,
      configurationId,
      auth_user,
      addDealConfigurationsDto,
    );
  }

  @Put(":id/attachments")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_update", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiBody({ type: AddDealAttachmentDto })
  @ApiResponse({ type: DealResponseDto })
  async addAttachment(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() addDealAttachmentDto: AddDealAttachmentDto,
  ) {
    return this.dealService.addAttachment(
      +id,
      auth_user,
      addDealAttachmentDto,
    );
  }

  @Put(":id/comments")
  @RequirePermissions('api.deals.write')
  @LogAction("deal_comment_add", "deals")
  @UseInterceptors(new TransformResponse(DealResponseDto))
  @ApiBody({ type: AddDealCommentDto })
  @ApiResponse({ type: DealResponseDto })
  async addComment(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() addDealCommentDto: AddDealCommentDto,
  ) {
    return this.dealService.addComment(
      +id,
      auth_user,
      addDealCommentDto,
    );
  }

  // Удаление сделки - требует права на удаление
  @Delete(":id")
  @Roles([RoleTypes.SuperAdmin])
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
