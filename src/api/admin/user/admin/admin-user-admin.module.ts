import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { AdminUserAdminService } from "./admin-user-admin.service";
import { AdminUserAdminController } from "./admin-user-admin.controller";

@Module({
  controllers: [AdminUserAdminController],
  providers: [AdminUserAdminService, EmailConfirmerService],
  exports: [AdminUserAdminService],
})
export class AdminUserAdminModule {}
