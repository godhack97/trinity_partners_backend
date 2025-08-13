import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRepository } from "src/orm/repositories/user.repository";
import { ACCEPTED_ROLES } from "../decorators/Roles";

@Injectable()
export class UserOwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const id = request.params.id;
    const authUser = request.auth_user;
    if (!(authUser.id == id)) {
      throw new HttpException(
        `У вас нет доступа к этому пользователю`,
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
