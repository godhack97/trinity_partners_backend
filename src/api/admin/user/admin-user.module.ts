import { AdminUserAdminModule } from "@api/admin/user/admin/admin-user-admin.module";
import { Module } from "@nestjs/common";
import { AdminUserService } from "./admin-user.service";
import { AdminUserController } from "./admin-user.controller";

@Module({
  imports: [AdminUserAdminModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
