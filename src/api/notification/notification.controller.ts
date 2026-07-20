import { NotificationsReadDto } from "@api/notification/dto/notifications-read.dto";
import { NotificationsResponseDto } from "@api/notification/dto/notifications.response.dto";
import { NotificationService } from "@api/notification/notification.service";
import { AuthUser } from "@decorators/auth-user";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { UserEntity } from "@orm/entities";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseInterceptors(new TransformResponse(NotificationsResponseDto, true))
  @ApiOkResponse({ type: [NotificationsResponseDto] })
  async getAll(@AuthUser() auth_user: Partial<UserEntity>) {
    return await this.notificationService.getAll(auth_user.id);
  }

  @Post("/readList")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new TransformResponse(NotificationsResponseDto, true))
  @ApiOkResponse({ type: [NotificationsResponseDto] })
  async readList(
    @AuthUser() auth_user: UserEntity,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    data: NotificationsReadDto,
  ) {
    return await this.notificationService.readList(+auth_user.id, data);
  }
}
