import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { UserModule } from 'src/api/user/user.module';
import { UserService } from 'src/api/user/user.service';

@Module({
  imports: [UserModule],
  controllers: [RegistrationController],
  providers: [RegistrationService, UserService, EmailConfirmerService],
})
export class RegistrationModule { }
