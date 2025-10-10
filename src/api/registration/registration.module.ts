import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RegistrationService } from "./registration.service";
import { RegistrationController } from "./registration.controller";
import { UserModule } from "src/api/user/user.module";
import { UserService } from "src/api/user/user.service";
import { ForbiddenInnRepository } from "src/orm/repositories/forbidden-inn.repository";
import { ForbiddenInn } from "src/orm/entities/forbidden-inn.entity";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";
import { UserToken } from "src/orm/entities/user-token.entity";

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([ForbiddenInn, UserRoleEntity, UserToken])],
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    UserService,
    EmailConfirmerService,
    ForbiddenInnRepository,
  ],
  exports: [ForbiddenInnRepository],
})
export class RegistrationModule {}