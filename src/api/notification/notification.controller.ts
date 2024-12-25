import { NotificationService } from "@api/notification/notification.service";
import {
    Controller
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiTags
} from "@nestjs/swagger";

@ApiTags('notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}
}