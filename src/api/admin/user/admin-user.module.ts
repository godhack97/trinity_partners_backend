import { AdminUserAdminModule } from "@api/admin/user/admin/admin-user-admin.module";
import { Module } from "@nestjs/common";
import { AdminUserService } from "./admin-user.service";
import { AdminUserController } from "./admin-user.controller";
import { AuthModule } from "@api/auth/auth.module";

@Module({
  imports: [AdminUserAdminModule, AuthModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
