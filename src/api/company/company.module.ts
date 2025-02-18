import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';

@Module({
  controllers: [CompanyController],
  providers: [
    CompanyService,
    EmailConfirmerService,
  ],
})
export class CompanyModule {}
