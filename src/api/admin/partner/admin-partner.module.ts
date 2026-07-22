import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { AdminPartnerController } from "./admin-partner.controller";
import AdminPartnerService from "./admin-partner.service";
import { NotificationModule } from "@api/notification/notification.module";
import { CompanyManagementController } from "../company-management/company-management.controller";
import { CompanyManagementService } from "../company-management/company-management.service";
import { CompanyNotificationOutboxController } from "../company-management/company-notification-outbox.controller";
import { CompanyNotificationOutboxService } from "../company-management/company-notification-outbox.service";

@Module({
  imports: [NotificationModule],
  controllers: [
    AdminPartnerController,
    CompanyManagementController,
    CompanyNotificationOutboxController,
  ],
  providers: [
    AdminPartnerService,
    CompanyManagementService,
    CompanyNotificationOutboxService,
    EmailConfirmerService,
  ],
  exports: [AdminPartnerService, CompanyManagementService],
})
export class AdminPartnerModule {}
