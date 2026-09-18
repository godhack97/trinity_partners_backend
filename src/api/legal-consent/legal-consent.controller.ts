import { Body, Controller, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "@decorators/Public";
import { RecordLegalConsentDto } from "./dto/record-legal-consent.dto";
import { LegalConsentService } from "./legal-consent.service";

@ApiTags("legal-consents")
@Controller("legal-consents")
export class LegalConsentController {
  constructor(private readonly service: LegalConsentService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async record(@Body() dto: RecordLegalConsentDto, @Req() request: Request) {
    const consent = await this.service.record(dto, request);
    return { id: consent.id, accepted_at: consent.accepted_at };
  }
}

