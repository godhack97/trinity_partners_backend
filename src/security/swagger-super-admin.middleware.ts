import type { NextFunction, Request, Response } from "express";
import { DataSource, IsNull, MoreThan } from "typeorm";
import { UserToken } from "@orm/entities/user-token.entity";
import { RoleTypes } from "@app/types/RoleTypes";
import { hashSessionToken, normalizeSessionClientId } from "@app/utils/session-token";
import { extractRequestSession } from "@app/security/request-session";

export const swaggerSuperAdminMiddleware = (dataSource: DataSource) =>
  async (request: Request, response: Response, next: NextFunction) => {
    const session = extractRequestSession(request);
    if (!session) {
      response.status(401).json({ message: "Требуется авторизация" });
      return;
    }

    const clientId =
      session.source === "cookie"
        ? "web:portal"
        : normalizeSessionClientId(
            String(request.headers["client-id"] || request.headers.origin || "web:admin"),
          );
    const userToken = await dataSource.getRepository(UserToken).findOne({
      where: {
        token: hashSessionToken(session.token),
        client_id: clientId,
        revoked_at: IsNull(),
        expires_at: MoreThan(new Date()),
      },
      relations: ["user", "user.role", "user.user_roles", "user.user_roles.role"],
    });

    const roles = [
      userToken?.user?.role?.name,
      ...(userToken?.user?.roles || []).map((role) => role.name),
    ];
    if (!roles.includes(RoleTypes.SuperAdmin)) {
      response.status(403).json({ message: "Доступ только для суперадминистратора" });
      return;
    }

    next();
  };
