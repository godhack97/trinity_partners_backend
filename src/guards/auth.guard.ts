import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { IS_PUBLIC_KEY } from '@decorators/Public';
import { Reflector } from '@nestjs/core';
import { UserRepository } from 'src/orm/repositories/user.repository';

const ERROR_MSG = `Пользователь не прошел аутентификацию!`;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userRepository: UserRepository,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;
    const request = context.switchToHttp().getRequest();
    const _token: string = request.headers.authorization || '';

    if (_token.length == 0) throw new UnauthorizedException(ERROR_MSG);

    const token = _token.substring(7);

    const user = await this.userRepository.findOneBy({ token });

    if(!user) throw new UnauthorizedException(ERROR_MSG);

    request['auth_user'] = user
    console.log('auth_user set',  request['auth_user'] )
    return Promise.resolve(!!user);
  }
}
