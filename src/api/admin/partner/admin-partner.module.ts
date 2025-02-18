import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { AdminPartnerController } from "./admin-partner.controller";
import AdminPartnerService from "./admin-partner.service";

@Module({
  controllers: [AdminPartnerController],
  providers: [
    AdminPartnerService,
    EmailConfirmerService
  ],
  exports: [AdminPartnerService],
})
export class AdminPartnerModule {}