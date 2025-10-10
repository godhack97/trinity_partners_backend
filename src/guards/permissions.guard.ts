import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Нет доступа к ресурсу');
    }

    // Суперадмин имеет все права
    if (this.isSuperAdmin(user)) {
      return true;
    }

    // Собираем все permissions из всех ролей пользователя
    const userPermissions = this.getAllUserPermissions(user);

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException('Недостаточно прав для выполнения операции');
    }

    return true;
  }

  private isSuperAdmin(user: any): boolean {
    return user.roles?.some(role => role.name === 'super_admin') || false;
  }

  private getAllUserPermissions(user: any): string[] {
    const permissions = new Set<string>();

    if (user.roles) {
      user.roles.forEach(role => {
        if (role.permissions) {
          role.permissions.forEach(p => permissions.add(p.name));
        }
      });
    }

    return Array.from(permissions);
  }
}