import { RoleTypes } from "@app/types/RoleTypes";
import { ALLOW_RESTRICTED_COMPANY_ACCESS } from "@decorators/AllowRestrictedCompanyAccess";
import { IS_PUBLIC_KEY } from "@decorators/Public";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CompanyStatus } from "@orm/entities";
import { UserRepository } from "@orm/repositories";

@Injectable()
export class CompanyPortalAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    if (
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_RESTRICTED_COMPANY_ACCESS,
        targets,
      )
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authenticatedUser = request.user;
    if (!authenticatedUser?.id) return true;

    const roleNames = this.getRoleNames(authenticatedUser);
    if (
      [
        RoleTypes.SuperAdmin,
        RoleTypes.EmployeeAdmin,
        RoleTypes.ContentManager,
        RoleTypes.PartnerManager,
        RoleTypes.TechnicalSpecialist,
      ].some((role) => roleNames.includes(role))
    ) {
      return true;
    }

    if (
      !roleNames.includes(RoleTypes.Partner) &&
      !roleNames.includes(RoleTypes.CompanyAdmin)
    ) {
      return true;
    }

    const user = await this.userRepository.findByIdWithPermissions(
      authenticatedUser.id,
    );
    const ownerCompany = roleNames.includes(RoleTypes.Partner)
      ? await user?.lazy_owner_company
      : null;
    const company = ownerCompany || user?.company_employee?.company;

    if (company?.status !== CompanyStatus.Accept) {
      throw new ForbiddenException(
        "Доступ компании ограничен. Доступны только причина ограничения, обращение в техподдержку и выход.",
      );
    }

    return true;
  }

  private getRoleNames(user: any): string[] {
    return [
      user.role?.name,
      ...(user.roles || []).map((role) => role.name),
      ...(user.user_roles || []).map((entry) => entry.role?.name),
    ].filter(Boolean);
  }
}
