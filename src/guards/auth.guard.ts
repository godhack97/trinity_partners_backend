import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { IS_PUBLIC_KEY } from "@decorators/Public";
import { ALLOW_RESTRICTED_COMPANY_ACCESS } from "@decorators/AllowRestrictedCompanyAccess";
import { Reflector } from "@nestjs/core";
import { UserRepository } from "src/orm/repositories/user.repository";
import { UserToken } from "src/orm/entities/user-token.entity";
import { IsNull, MoreThan, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import {
  hashSessionToken,
  normalizeSessionClientId,
} from "src/utils/session-token";
import { isBuiltInSuperAdminEmail } from "@app/security/built-in-super-admin";
import { extractRequestSession } from "@app/security/request-session";

const ERROR_MSG = `Пользователь не прошел аутентификацию!`;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly reflector: Reflector,

    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const allowRestricted = this.reflector.getAllAndOverride<boolean>(
      ALLOW_RESTRICTED_COMPANY_ACCESS,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    const session = extractRequestSession(request);

    // Собираем client_id
    const clientId = session?.source === "cookie"
      ? "web:portal"
      : normalizeSessionClientId(headers["client-id"] || headers["origin"]);

    if (!session)
      throw new UnauthorizedException(ERROR_MSG);
    const token = session.token;

    // Ищем токен в таблице user_tokens по token + client_id
    const userToken = await this.userTokenRepository.findOne({
      where: {
        token: hashSessionToken(token),
        client_id: clientId,
        revoked_at: IsNull(),
        expires_at: MoreThan(new Date()),
      },
      relations: [
        "user",
        "user.role",
        "user.role.permissions",
        "user.user_info",
        "user.user_roles",
        "user.user_roles.role",
        "user.user_roles.role.permissions",
      ],
    });

    if (!userToken || !userToken.user)
      throw new UnauthorizedException(ERROR_MSG);

    // Проверяем что пользователь активен
    if (
      !userToken.user.is_activated &&
      !isBuiltInSuperAdminEmail(userToken.user.email) &&
      !allowRestricted
    )
      throw new UnauthorizedException('Пользователь не активирован');

    // Устанавливаем пользователя в запрос для совместимости с существующим кодом
    request["auth_user"] = userToken.user;
    
    // Также устанавливаем в request.user для PermissionsGuard
    request["user"] = userToken.user;
    request["auth_session_source"] = session.source;
    request["auth_session_token"] = token;

    // Legacy services still read the bearer header. Populate it internally for
    // cookie-authenticated portal requests without exposing the token to JS.
    if (session.source === "cookie") {
      request.headers.authorization = `Bearer ${token}`;
    }

    return true;
  }
}
