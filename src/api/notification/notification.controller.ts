import { NotificationsReadDto } from "@api/notification/dto/notifications-read.dto";
import { NotificationsResponseDto } from "@api/notification/dto/notifications.response.dto";
import { NotificationService } from "@api/notification/notification.service";
import { AuthUser } from "@decorators/auth-user";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import {
    Controller,
    Get,
    Post,
    Body,
    UseInterceptors
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiResponse,
    ApiTags
} from "@nestjs/swagger";
import { UserEntity } from "@orm/entities";

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async getAll(@AuthUser() auth_user: Partial<UserEntity>) {
        return await this.notificationService.getAll(auth_user.id);
    }

    @Post('/readList')
    @UseInterceptors(new TransformResponse(NotificationsResponseDto, true))
    @ApiResponse({ type: NotificationsResponseDto })
    async readList(@AuthUser() auth_user: UserEntity, @Body() data: NotificationsReadDto ) {
        return await this.notificationService.readList(+auth_user.id, data);
    }
}