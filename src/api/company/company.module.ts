import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CompanyController } from "./company.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationModule } from "@api/notification/notification.module";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";
import { AdminPartnerModule } from "@api/admin/partner/admin-partner.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRoleEntity]),
    NotificationModule,
    AdminPartnerModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService, EmailConfirmerService],
})
export class CompanyModule {}
