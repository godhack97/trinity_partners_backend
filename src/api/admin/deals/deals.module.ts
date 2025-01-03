import { NotificationService } from "@api/notification/notification.service";
import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';

@Module({
  controllers: [DealsController],
  providers: [DealsService, NotificationService],
})
export class DealsModule {}
