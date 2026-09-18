import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, createHmac } from "node:crypto";
import type { Request } from "express";
import { IsNull, MoreThan, Repository } from "typeorm";
import { LegalConsentEntity, LegalPolicyType, UserToken } from "@orm/entities";
import { extractRequestSession } from "@app/security/request-session";
import { hashSessionToken } from "@app/utils/session-token";
import { RecordLegalConsentDto } from "./dto/record-legal-consent.dto";

@Injectable()
export class LegalConsentService {
  constructor(
    @InjectRepository(LegalConsentEntity)
    private readonly repository: Repository<LegalConsentEntity>,
    @InjectRepository(UserToken)
    private readonly tokenRepository: Repository<UserToken>,
    private readonly configService: ConfigService,
  ) {}

  async record(dto: RecordLegalConsentDto, request: Request) {
    const session = extractRequestSession(request);
    const sessionHash = session ? hashSessionToken(session.token) : null;
    const activeSession = sessionHash
      ? await this.tokenRepository.findOneBy({
          token: sessionHash,
          revoked_at: IsNull(),
          expires_at: MoreThan(new Date()),
        })
      : null;

    return this.repository.save(
      this.repository.create({
        user_id: activeSession?.user_id || null,
        session_hash: sessionHash,
        policy_type: dto.policy_type,
        policy_version: dto.policy_version,
        accepted: dto.accepted,
        source: "portal",
        ip_hash: this.hashPersonalValue(request.ip),
        user_agent_hash: this.hashPersonalValue(request.headers["user-agent"]),
        metadata: dto.metadata || null,
      }),
    );
  }

  async recordForUser(
    userId: number,
    policyType: LegalPolicyType,
    source: string,
    policyVersion?: string,
  ) {
    return this.repository.save(
      this.repository.create({
        user_id: userId,
        session_hash: null,
        policy_type: policyType,
        policy_version: policyVersion || this.versionFor(policyType),
        accepted: true,
        source,
        ip_hash: null,
        user_agent_hash: null,
        metadata: null,
      }),
    );
  }

  private versionFor(policyType: LegalPolicyType) {
    if (policyType === LegalPolicyType.Cookie) {
      return String(this.configService.get("COOKIE_POLICY_VERSION"));
    }
    if (policyType === LegalPolicyType.UserAgreement) {
      return String(this.configService.get("USER_AGREEMENT_VERSION"));
    }
    if (policyType === LegalPolicyType.Privacy152Fz) {
      return String(this.configService.get("PRIVACY_POLICY_VERSION"));
    }
    return String(this.configService.get("FEDERAL_LAWS_POLICY_VERSION"));
  }

  private hashPersonalValue(value: unknown) {
    if (!value) return null;
    const secret = String(this.configService.get("CSRF_SECRET"));
    return createHmac("sha256", secret)
      .update(createHash("sha256").update(String(value)).digest("hex"))
      .digest("hex");
  }
}
