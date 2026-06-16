import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CompanyController } from "./company.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationModule } from "@api/notification/notification.module";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";
import { DealEntity } from "@orm/entities";

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity, DealEntity]), NotificationModule],
  controllers: [CompanyController],
  providers: [CompanyService, EmailConfirmerService],
})
export class CompanyModule {}
