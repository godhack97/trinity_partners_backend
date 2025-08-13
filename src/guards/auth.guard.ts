import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { IS_PUBLIC_KEY } from "@decorators/Public";
import { Reflector } from "@nestjs/core";
import { UserRepository } from "src/orm/repositories/user.repository";
import { UserToken } from "src/orm/entities/user-token.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

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

    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    const body = request.body || {};
    const query = request.query || {};

    const _token: string = headers.authorization || "";

    // Собираем client_id
    const clientId = headers["origin"];

    if (!_token || _token.length === 0)
      throw new UnauthorizedException(ERROR_MSG);
    if (!clientId) throw new UnauthorizedException(`Client ID отсутствует!`);

    const token = _token.substring(7);

    // console.log('token:', token);
    // console.log('clientId:', clientId);

    // Ищем токен в таблице user_tokens по token + client_id
    const userToken = await this.userTokenRepository.findOne({
      where: { token, client_id: clientId },
      relations: ["user"],
    });

    if (!userToken || !userToken.user)
      throw new UnauthorizedException(ERROR_MSG);

    // Устанавливаем пользователя в запрос
    request["auth_user"] = userToken.user;

    return true;
  }
}
