import { Module } from '@nestjs/common';
import { DealService } from './deal.service';
import { DealController } from './deal.controller';
import { CheckUserOrCompanyStatusGuard } from '@app/guards/check-user-or-company-status.guard';

@Module({
  controllers: [DealController],
  providers: [DealService, CheckUserOrCompanyStatusGuard],
})
export class DealModule {}
