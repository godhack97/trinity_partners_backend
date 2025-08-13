import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserEntity } from "../orm/entities";

export const AuthUser = createParamDecorator(
  (data: string, context: ExecutionContext): Partial<UserEntity> => {
    return context.switchToHttp().getRequest().auth_user;
  },
);
