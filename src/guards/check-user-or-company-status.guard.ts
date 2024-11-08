import { RoleTypes } from '@app/types/RoleTypes';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CompanyEmployeeStatus, CompanyStatus } from '@orm/entities';
import { UserRepository } from '@orm/repositories';

@Injectable()
export class CheckUserOrCompanyStatusGuard implements CanActivate {

  constructor(
    private readonly userRepository: UserRepository,
  ) {}
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const _token: string = request.headers.authorization || '';

    if (_token.length == 0) {
      return false;
    }

    const token = _token.substring(7);

    const user = await this.userRepository.findByTokenWithCompany(token);

    if(!user) {
      throw new UnauthorizedException(`Пользователь по этому токену не найден!`);
    }

    if(user.role.name ===RoleTypes.SuperAdmin) {
      return true;
    }

    if(user.role.name === RoleTypes.Partner) {
      if(user.company_employee.company.status !== CompanyStatus.Accept) {
        throw new ForbiddenException('Компания не прошла проврку администратором!');
      }
      return true;
    }

    if([RoleTypes.Employee, RoleTypes.EmployeeAdmin].includes(user.role.name as RoleTypes)) {
      if(user.company_employee.status !== CompanyEmployeeStatus.Accept) {
        throw new ForbiddenException('Ваш статус не подтвержен!');
      }
      return true;
    }
    return false;
  }
}
