import { NotificationService } from "@api/notification/notification.service";
import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminUserModule } from "./user/admin-user.module";
import { RoleGuard } from "@app/guards/role.guard";
import { APP_GUARD } from "@nestjs/core";
import { AdminPartnerModule } from "./partner/admin-partner.module";
import { AdminConfiguratorModule } from "./configurator/admin-configurator.module";
import { AdminImageModule } from "@api/admin/image/admin-image.module";
import { AdminDealModule } from '@api/admin/deal/admin-deal.module';
import { AdminDistributorModule } from './distributor/admin-distributor.module';
@Module({
  imports:[
    AdminUserModule,
    AdminPartnerModule,
    AdminConfiguratorModule,
    AdminImageModule,
    AdminDealModule,
    AdminDistributorModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    NotificationService,
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    }
  ],
  exports: [AdminService],
})
export class AdminModule { }
