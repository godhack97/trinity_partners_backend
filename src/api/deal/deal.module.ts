import { Module } from '@nestjs/common';
import { DealService } from './deal.service';
import { DealController } from './deal.controller';
import { CheckUserOrCompanyStatusGuard } from '@app/guards/check-user-or-company-status.guard';
import { Bitrix24Module } from '@integrations/bitrix24/bitrix24.module';
import { EmailConfirmerService } from '@api/email-confirmer/email-confirmer.service';

@Module({
  imports: [Bitrix24Module],
  controllers: [DealController],
  providers: [
    DealService, 
    EmailConfirmerService,
    CheckUserOrCompanyStatusGuard,
  ],
  exports: [DealService],
})
export class DealModule {}