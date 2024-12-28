import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailConfirmerService],
})
export class AuthModule { }
