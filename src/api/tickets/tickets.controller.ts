import { AuthUser } from "@decorators/auth-user";
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseInterceptors,
} from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { TicketsService } from "./tickets.service";
import { CreateTicketDto } from "./dto/request/create-ticket.dto";
import { AddTicketMessageDto } from "./dto/request/add-ticket-message.dto";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { TicketResponseDto } from "./dto/response/ticket-response.dto";

@ApiTags("tickets")
@ApiBearerAuth()
@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseInterceptors(new TransformResponse(TicketResponseDto))
  @ApiResponse({ type: TicketResponseDto, isArray: true })
  findAll(@AuthUser() auth_user: UserEntity) {
    return this.ticketsService.findAll(auth_user);
  }

  @Get("count")
  @ApiResponse({ type: Number })
  getCount(@AuthUser() auth_user: UserEntity) {
    return this.ticketsService.getCount(auth_user);
  }

  @Get(":id")
  @UseInterceptors(new TransformResponse(TicketResponseDto))
  @ApiResponse({ type: TicketResponseDto })
  findOne(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    return this.ticketsService.findOne(+id, auth_user);
  }

  @Post()
  @ApiBody({ type: () => CreateTicketDto })
  @UseInterceptors(new TransformResponse(TicketResponseDto))
  @ApiResponse({ type: TicketResponseDto })
  create(
    @AuthUser() auth_user: UserEntity,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(auth_user, dto);
  }

  @Post(":id/messages")
  @ApiBody({ type: () => AddTicketMessageDto })
  @UseInterceptors(new TransformResponse(TicketResponseDto))
  @ApiResponse({ type: TicketResponseDto })
  addMessage(
    @Param("id") id: string,
    @AuthUser() auth_user: UserEntity,
    @Body() dto: AddTicketMessageDto,
  ) {
    return this.ticketsService.addMessage(+id, auth_user, dto);
  }

  @Patch(":id/read")
  @UseInterceptors(new TransformResponse(TicketResponseDto))
  @ApiResponse({ type: TicketResponseDto })
  markAsRead(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    return this.ticketsService.markAsRead(+id, auth_user);
  }

  @Patch(":id/close")
  @UseInterceptors(new TransformResponse(TicketResponseDto))
  @ApiResponse({ type: TicketResponseDto })
  close(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    return this.ticketsService.close(+id, auth_user);
  }

  @Patch(":id/reopen")
  @UseInterceptors(new TransformResponse(TicketResponseDto))
  @ApiResponse({ type: TicketResponseDto })
  reopen(@Param("id") id: string, @AuthUser() auth_user: UserEntity) {
    return this.ticketsService.reopen(+id, auth_user);
  }
}
