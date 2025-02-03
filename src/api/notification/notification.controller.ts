import { NotificationService } from "@api/notification/notification.service";
import { AuthUser } from "@decorators/auth-user";
import {
    Controller,
    Get
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiTags
} from "@nestjs/swagger";
import { UserEntity } from "@orm/entities";

@ApiTags('notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Get()
    async getAll(@AuthUser() auth_user: Partial<UserEntity>) {
        return await this.notificationService.getAll(auth_user.id);
    }
}