import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminUserModule } from "./user/admin-user.module";
import { RoleGuard } from "../../guards/role.guard";
import { APP_GUARD } from "@nestjs/core";
import { AdminPartnerModule } from "./partner/admin-partner.module";
import { AdminConfiguratorModule } from "./configurator/admin-configurator.module";
import { AdminImageModule } from "@api/admin/image/admin-image.module";
import { DealsModule } from './deals/deals.module';
import { AdminDistributorModule } from './distributor/admin-distributor.module';
@Module({
  imports:[
    AdminUserModule,
    AdminPartnerModule,
    AdminConfiguratorModule,
    AdminImageModule,
    DealsModule,
    AdminDistributorModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    }
  ],
  exports: [AdminService],
})
export class AdminModule { }
