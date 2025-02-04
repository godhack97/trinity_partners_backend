import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { NewsService } from "@api/news/news.service";
import { NotificationService } from "@api/notification/notification.service";
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailConfirmerService,
    NotificationService,
    NewsService
  ],
})
export class AuthModule { }
