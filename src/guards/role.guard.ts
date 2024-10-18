import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRepository } from "src/orm/repositories/user.repository";
import { ACCEPTED_ROLES } from "../decorators/Roles";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly userRepository: UserRepository,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>(ACCEPTED_ROLES, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!roles) return true;

    if (roles.length == 0) return true;

    const request = context.switchToHttp().getRequest();
    const _token: string = request.headers.authorization || "";

    if (_token.length == 0) return false;

    const token = _token.substring(7);

    const user = await this.userRepository.findOneBy({ token });
    return roles.includes(user.role.name);
  }
}
