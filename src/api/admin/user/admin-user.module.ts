import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { UserService } from "@api/user/user.service";
import { Module } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';

@Module({
  controllers: [AdminUserController],
  providers: [
    AdminUserService,
    UserService,
    EmailConfirmerService
  ],
  exports: [AdminUserService],
})
export class AdminUserModule { }
