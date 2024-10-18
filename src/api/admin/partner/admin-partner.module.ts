import { Module } from "@nestjs/common";
import { AdminPartnerController } from "./admin-partner.controller";
import AdminPartnerService from "./admin-partner.service";

@Module({
  controllers: [AdminPartnerController],
  providers: [AdminPartnerService],
  exports: [AdminPartnerService],
})
export class AdminPartnerModule {}