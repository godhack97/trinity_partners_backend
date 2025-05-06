import { NotificationController } from "@api/notification/notification.controller";
import { NotificationService } from "@api/notification/notification.service";
import { Module } from "@nestjs/common";

@Module({
    controllers: [NotificationController],
    providers: [NotificationService],
    exports: [NotificationService]
})
export class NotificationModule {}