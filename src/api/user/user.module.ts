import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ForbiddenInn } from 'src/orm/entities/forbidden-inn.entity';
import { ForbiddenInnRepository } from 'src/orm/repositories/forbidden-inn.repository';
import { UserToken } from 'src/orm/entities/user-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForbiddenInn,
      UserToken,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, EmailConfirmerService, ForbiddenInnRepository],
  exports: [UserService],
})
export class UserModule { }