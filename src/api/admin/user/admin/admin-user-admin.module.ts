import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";
import { AdminUserAdminService } from "./admin-user-admin.service";
import { AdminUserAdminController } from "./admin-user-admin.controller";


@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity])],
  controllers: [AdminUserAdminController],
  providers: [AdminUserAdminService, EmailConfirmerService],
  exports: [AdminUserAdminService],
})
export class AdminUserAdminModule {}