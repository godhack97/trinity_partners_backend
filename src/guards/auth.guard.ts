import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { IS_PUBLIC_KEY } from '../decorators/Public';
import { Reflector } from '@nestjs/core';
import { UserRepository } from 'src/orm/repositories/user.repository';

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

    if (_token.length == 0) return false;

    const token = _token.substring(7);

    const user = await this.userRepository.findOneBy({ token });

    if(!user) throw new UnauthorizedException(`Пользователь по этому токену не найден!`);

    request['auth_user'] = {
      id: user.id,
      email: user.email,
      is_activated: user.is_activated,
      role_id: user.role_id,
    };
    console.log('auth_user set',  request['auth_user'] )
    return Promise.resolve(!!user);
  }
}
