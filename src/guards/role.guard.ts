import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRepository } from "src/orm/repositories/user.repository";
import { ACCEPTED_ROLES } from "@decorators/Roles";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly userRepository: UserRepository,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>(ACCEPTED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length == 0) return true;

    const request = context.switchToHttp().getRequest();

    const user = await this.userRepository.findByIdWithPermissions(
      request.auth_user.id,
    );

    const userRoleNames = [
      user.role?.name,
      ...(user.roles || []).map((role) => role.name),
    ].filter(Boolean);

    if (roles.some((role) => userRoleNames.includes(role))) return true;

    throw new HttpException(`У вас недостаточно прав!`, HttpStatus.FORBIDDEN);
  }
}
