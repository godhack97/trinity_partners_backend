import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { CompanyController } from "./company.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity])],
  controllers: [CompanyController],
  providers: [CompanyService, EmailConfirmerService],
})
export class CompanyModule {}
