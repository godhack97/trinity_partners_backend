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
    const body = request.body || {};
    const query = request.query || {};

    const _token: string = headers.authorization || "";

    // Собираем client_id
    const clientId = normalizeSessionClientId(
      headers["origin"] || headers["client-id"],
    );

    if (!_token || _token.length === 0)
      throw new UnauthorizedException(ERROR_MSG);
    const token = _token.substring(7);

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
    if (!userToken.user.is_activated && !allowRestricted)
      throw new UnauthorizedException('Пользователь не активирован');

    // Устанавливаем пользователя в запрос для совместимости с существующим кодом
    request["auth_user"] = userToken.user;
    
    // Также устанавливаем в request.user для PermissionsGuard
    request["user"] = userToken.user;

    return true;
  }
}
