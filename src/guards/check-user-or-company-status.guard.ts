import { RoleTypes } from "@app/types/RoleTypes";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { CompanyEmployeeStatus, CompanyStatus } from "@orm/entities";
import { UserRepository } from "@orm/repositories";

@Injectable()
export class CheckUserOrCompanyStatusGuard implements CanActivate {
  constructor(private readonly userRepository: UserRepository) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const _token: string = request.headers.authorization || "";

    if (_token.length == 0) {
      return false;
    }

    const token = _token.substring(7);

    const user = await this.userRepository.findByTokenWithCompany(token);

    if (!user) {
      throw new UnauthorizedException(
        `Пользователь по этому токену не найден!`,
      );
    }

    const roleNames = [
      user.role?.name,
      ...(user.roles || []).map((role) => role.name),
    ];

    if (roleNames.includes(RoleTypes.SuperAdmin)) {
      return true;
    }

    if (
      roleNames.includes(RoleTypes.Partner) ||
      roleNames.includes(RoleTypes.CompanyAdmin)
    ) {
      const ownerCompany = await user.lazy_owner_company;
      const company = ownerCompany || user.company_employee?.company;

      if (company?.status === CompanyStatus.Suspended) {
        throw new ForbiddenException(
          "Доступ к порталу приостановлен. Есть вопросы? Обратитесь к КЦ Тринити.",
        );
      }

      if (company?.status !== CompanyStatus.Accept) {
        throw new ForbiddenException(
          "Компания не прошла проврку администратором!",
        );
      }
      return true;
    }

    if (
      [RoleTypes.Employee, RoleTypes.EmployeeAdmin].includes(
        user.role.name as RoleTypes,
      ) ||
      roleNames.includes(RoleTypes.SalesManager) ||
      roleNames.includes(RoleTypes.TechnicalSpecialist) ||
      roleNames.includes(RoleTypes.Staff)
    ) {
      if (user.company_employee?.company?.status === CompanyStatus.Suspended) {
        throw new ForbiddenException(
          "Доступ к порталу приостановлен. Есть вопросы? Обратитесь к КЦ Тринити.",
        );
      }

      if (
        [
          CompanyEmployeeStatus.Blocked,
          CompanyEmployeeStatus.Deleted,
        ].includes(user.company_employee.status)
      ) {
        throw new ForbiddenException(
          "Доступ к порталу заблокирован. Есть вопросы? Обратитесь к КЦ Тринити.",
        );
      }

      if (user.company_employee.status !== CompanyEmployeeStatus.Accept) {
        throw new ForbiddenException("Ваш статус не подтвержен!");
      }
      return true;
    }
    return false;
  }
}
