import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService, EmailConfirmerService],
  exports: [UserService],
})
export class UserModule { }
