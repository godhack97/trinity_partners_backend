// src/api/auth/auth.module.ts

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserEntity } from "src/orm/entities/user.entity";
import { UserToken } from "src/orm/entities/user-token.entity";
import { ResetHashRepository } from "src/orm/repositories/reset-hash.repository";
import { UserRepository } from "src/orm/repositories/user.repository";
import { EmailConfirmModule } from "@api/email-confirmer/email-confirmer.module";
import { ImportantAlertModule } from "@api/important-alert/important-alert.module";
import { NotificationModule } from "@api/notification/notification.module";
import { NewsModule } from "@api/news/news.module";
import { LogsModule } from "@app/logs/logs.module";
import { ImpersonationService } from "./impersonation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserToken, ResetHashRepository]),
    EmailConfirmModule,
    ImportantAlertModule,
    NotificationModule,
    NewsModule,
    LogsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, ImpersonationService, UserRepository],
  exports: [AuthService, ImpersonationService],
})
export class AuthModule {}
