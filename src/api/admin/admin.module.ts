import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminCountsController } from './counts/admin-counts.controller';
import { AdminUserModule } from "./user/admin-user.module";
import { RoleGuard } from "@app/guards/role.guard";
import { APP_GUARD } from "@nestjs/core";
import { AdminPartnerModule } from "./partner/admin-partner.module";
import { AdminConfiguratorModule } from "./configurator/admin-configurator.module";
import { AdminImageModule } from "@api/admin/image/admin-image.module";
import { AdminDealModule } from '@api/admin/deal/admin-deal.module';
import { AdminDistributorModule } from './distributor/admin-distributor.module';
import { NewsModule } from '../news/news.module';
import { HttpModule } from '@nestjs/axios';
import { Bitrix24Module } from '../../integrations/bitrix24/bitrix24.module';
import { LogsListModule } from '@api/logs-list/logs.module';

import { NotificationService } from "@api/notification/notification.service";
import { AdminUserAdminService } from "@api/admin/user/admin/admin-user-admin.service";
import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { UsersService } from "@api/users/users.service";
import { ConfiguratorService } from "@api/configurator/configurator.service";
import { DistributorService } from "@api/distributor/distributor.service";
import { DealService } from "@api/deal/deal.service";
import { Bitrix24Service } from '../../integrations/bitrix24/bitrix24.service';


@Module({
  imports:[
    LogsListModule,
    NewsModule,
    AdminUserModule,
    AdminPartnerModule,
    AdminConfiguratorModule,
    AdminImageModule,
    AdminDealModule,
    AdminDistributorModule,
    HttpModule,
    Bitrix24Module,
  ],
  controllers: [AdminController, AdminCountsController],
  providers: [
    Bitrix24Service,
    DistributorService,
    DealService,
    AdminUserAdminService,
    UsersService,
    EmailConfirmerService,
    AdminService,
    ConfiguratorService,
    NotificationService,
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    }
  ],
  exports: [AdminService],
})
export class AdminModule { }
