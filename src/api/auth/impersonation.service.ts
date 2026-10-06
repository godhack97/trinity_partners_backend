import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { randomBytes } from "crypto";
import { IsNull, Like, MoreThan, Repository } from "typeorm";
import { UserEntity, UserToken } from "@orm/entities";
import { UserRepository } from "@orm/repositories/user.repository";
import { UserActionsService } from "@app/logs/user-actions.service";
import { isBuiltInSuperAdminEmail } from "@app/security/built-in-super-admin";
import { createSessionToken, hashSessionToken } from "@app/utils/session-token";

const EXCHANGE_TTL_MS = 90 * 1000;
const IMPERSONATED_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const EXCHANGE_CLIENT_PREFIX = "impersonation:exchange:";
export const IMPERSONATED_PORTAL_CLIENT_PREFIX = "web:portal:impersonated:";

@Injectable()
export class ImpersonationService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
    private readonly userActionsService: UserActionsService,
  ) {}

  async issue(actor: Partial<UserEntity>, targetUserId: number) {
    if (!actor?.id || !isBuiltInSuperAdminEmail(actor.email)) {
      throw new ForbiddenException(
        "Вход от имени пользователя доступен только главному администратору",
      );
    }

    const target = await this.userRepository.findByIdWithPermissions(targetUserId);
    if (!target) throw new NotFoundException("Пользователь не найден");

    const code = randomBytes(32).toString("hex");
    const clientId = `${EXCHANGE_CLIENT_PREFIX}${actor.id}`;
    const expiresAt = new Date(Date.now() + EXCHANGE_TTL_MS);
    const existing = await this.userTokenRepository.findOneBy({
      user_id: target.id,
      client_id: clientId,
    });
    const patch = {
      token: hashSessionToken(code),
      expires_at: expiresAt,
      revoked_at: null,
    };
    const exchange = existing
      ? this.userTokenRepository.merge(existing, patch)
      : this.userTokenRepository.create({
          user_id: target.id,
          client_id: clientId,
          ...patch,
        });
    await this.userTokenRepository.save(exchange);
    await this.userActionsService.log(actor.id, "admin_user_impersonation_issued", {
      target_user_id: target.id,
      target_email: target.email,
      expires_at: expiresAt.toISOString(),
    });

    return { code, expires_at: expiresAt };
  }

  async exchange(code: string, req?: Request) {
    const tokenHash = hashSessionToken(code);
    const exchange = await this.userTokenRepository.findOne({
      where: {
        token: tokenHash,
        client_id: Like(`${EXCHANGE_CLIENT_PREFIX}%`),
        revoked_at: IsNull(),
        expires_at: MoreThan(new Date()),
      },
    });
    if (!exchange) throw new UnauthorizedException("Код входа недействителен или истёк");

    const consumed = await this.userTokenRepository.update(
      { id: exchange.id, token: tokenHash, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
    if (consumed.affected !== 1) {
      throw new UnauthorizedException("Код входа уже использован");
    }

    const actorId = Number(exchange.client_id.slice(EXCHANGE_CLIENT_PREFIX.length));
    const target = await this.userRepository.findByIdWithPermissions(exchange.user_id);
    if (!target || !Number.isInteger(actorId) || actorId <= 0) {
      throw new UnauthorizedException("Код входа недействителен");
    }

    const token = createSessionToken();
    const session = this.userTokenRepository.create({
      user_id: target.id,
      client_id: `${IMPERSONATED_PORTAL_CLIENT_PREFIX}${actorId}:${randomBytes(8).toString("hex")}`,
      token: hashSessionToken(token),
      expires_at: new Date(Date.now() + IMPERSONATED_SESSION_TTL_MS),
      revoked_at: null,
    });
    await this.userTokenRepository.save(session);
    await this.userActionsService.log(actorId, "admin_user_impersonation_started", {
      target_user_id: target.id,
      target_email: target.email,
      ip: this.clientIp(req),
      user_agent: req?.headers?.["user-agent"] || "",
    });

    return { token, user: { id: target.id, email: target.email } };
  }

  private clientIp(req?: Request) {
    const forwarded = req?.headers?.["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
    return (
      forwardedIp?.trim() ||
      (req?.headers?.["x-real-ip"] as string) ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      "unknown"
    ).replace("::ffff:", "");
  }
}
