import { NotificationService } from "@api/notification/notification.service";
import { Module } from '@nestjs/common';
import { AdminDealService } from './admin-deal.service';
import { AdminDealController } from './admin-deal.controller';

@Module({
  controllers: [AdminDealController],
  providers: [AdminDealService, NotificationService],
})
export class AdminDealModule {}
