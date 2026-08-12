import { NotificationService } from "@api/notification/notification.service";
import { Module } from "@nestjs/common";
import { AdminDealService } from "./admin-deal.service";
import { AdminDealController } from "./admin-deal.controller";
import { DealModule } from "@api/deal/deal.module";

@Module({
  imports: [DealModule],
  controllers: [AdminDealController],
  providers: [AdminDealService, NotificationService],
})
export class AdminDealModule {}
