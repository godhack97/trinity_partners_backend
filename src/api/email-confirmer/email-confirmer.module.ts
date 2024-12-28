import { EmailConfirmController } from "@api/email-confirmer/email-confirmer.controller";
import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [EmailConfirmController],
  providers: [EmailConfirmerService],
})
export class EmailConfirmModule {}