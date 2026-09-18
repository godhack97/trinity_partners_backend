import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LegalConsentEntity, UserToken } from "@orm/entities";
import { LegalConsentController } from "./legal-consent.controller";
import { LegalConsentService } from "./legal-consent.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LegalConsentEntity, UserToken])],
  controllers: [LegalConsentController],
  providers: [LegalConsentService],
  exports: [LegalConsentService],
})
export class LegalConsentModule {}

