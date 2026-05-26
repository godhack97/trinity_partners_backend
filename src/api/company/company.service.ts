import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { AuthTokenService } from "@app/services/auth-token/auth-token.service";
import { RoleTypes } from "@app/types/RoleTypes";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { InternalServerErrorException } from "@nestjs/common/exceptions/internal-server-error.exception";
import { CompanyEmployeeStatus, UserEntity } from "@orm/entities";
import { PartnershipType } from "@orm/entities/company.entity";
import {
  CompanyEmployeeRepository,
  CompanyRepository,
  RoleRepository,
  UserInfoRepository,
  UserRepository,
} from "@orm/repositories";
import { AddEmployeeAdminRequestDto } from "./dto/request/add-employee-admin-request.dto";
import { AddEmployeeRequestDto } from "./dto/request/add-employee.request.dto";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class CompanyService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userInfoRepository: UserInfoRepository,
    private readonly roleRepository: RoleRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  async findByPartnershipType(partnershipType: PartnershipType) {
    return await this.companyRepository.findAcceptedByPartnershipType(
      partnershipType,
    );
  }

  async addEmployee(
    auth_user: UserEntity,
    addEmployeeDto: AddEmployeeRequestDto,
  ) {
    const user = await this.userRepository.findByEmailWithCompanyEmployees(
      addEmployeeDto.email,
    );

    if (user.role.name !== RoleTypes.Employee) {
      throw new BadRequestException(
        "Этот пользователь не может быть добавлен!",
      );
    }

    // Проверяем, что сотрудник уже привязан к нашей компании
    const authUserCompany =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        auth_user.id,
      );
    const employeeCompany =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        user.id,
      );

    if (
      !employeeCompany ||
      employeeCompany.company_id !== authUserCompany.company_id
    ) {
      throw new ForbiddenException(
        "Этот сотрудник не принадлежит вашей компании",
      );
    }

    if (employeeCompany.status === CompanyEmployeeStatus.Accept) {
      throw new BadRequestException("Этот сотрудник уже добавлен или отклонен");
    }

    // Одобряем сотрудника
    await this.companyEmployeeRepository.update(employeeCompany.id, {
      status: CompanyEmployeeStatus.Accept,
    });

    await this.userRepository.update(user.id, { is_activated: true });

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: "Вас добавили к списку сотрудников!",
      template: "employee-add-to-company",
      context: {
        link: "https://partner.trinity.ru/",
      },
    });

    return { success: true };
  }

  async getCompanyEmployees(request: Request) {
    const token = this.authTokenService.extractToken(request);
    const role = await this.authTokenService.getUserRole(token);
    const roleNames = role.roles || [role.role];

    if (
      !this.hasAnyRole(roleNames, [
        RoleTypes.Partner,
        RoleTypes.EmployeeAdmin,
        RoleTypes.CompanyAdmin,
        RoleTypes.SuperAdmin,
      ])
    ) {
      throw new HttpException(
        "У вас нет прав для данного действия",
        HttpStatus.FORBIDDEN,
      );
    }

    if (roleNames.includes(RoleTypes.SuperAdmin)) {
      return await this.companyEmployeeRepository.findAllCompanyEmployeesWithUsersAndInfo();
    }

    if (
      this.hasAnyRole(roleNames, [
        RoleTypes.Partner,
        RoleTypes.EmployeeAdmin,
        RoleTypes.CompanyAdmin,
      ])
    ) {
      return await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(
        role.companyId,
      );
    }
  }

  async changeStatusEmployeeAdmin(
    request: Request,
    id: number,
    body: AddEmployeeAdminRequestDto,
  ) {
    const { user } = await this.checkUserPermissions(request, id);

    if (!body.isEmployeeAdmin) {
      await this.assertNotLastCompanyAdmin(user);
    }

    const newRoleName = body.isEmployeeAdmin
      ? RoleTypes.CompanyAdmin
      : RoleTypes.SalesManager;

    const newRole = await this.roleRepository.findByRole(newRoleName);

    const updateResult = await this.userRepository.update(user.id, {
      role: newRole,
    });

    await this.userRoleRepository.delete({ user_id: user.id });
    await this.userRoleRepository.save({
      user_id: user.id,
      role_id: newRole.id,
    });

    if (updateResult.affected === 0) {
      throw new InternalServerErrorException(
        "Не удалось обновить роль пользователя",
      );
    }

    return {
      message: `Роль сотрудника ${user.id} была успешно заменена на ${newRoleName}`,
      succes: true,
    };
  }

  async removeEmployee(request: Request, id: number) {
    const { user } = await this.checkUserPermissions(request, id);
    await this.assertNotLastCompanyAdmin(user);
    const role = await this.roleRepository.findByRole(RoleTypes.Employee);
    const updateResult = await this.userRepository.update(user.id, {
      role,
    });

    await this.userRoleRepository.delete({ user_id: user.id });
    await this.userRoleRepository.save({
      user_id: user.id,
      role_id: role.id,
    });

    if (updateResult.affected === 0) {
      throw new InternalServerErrorException(
        "Не удалось обновить роль пользователя",
      );
    }

    const updateStatusResult = await this.companyEmployeeRepository.update(
      user.company_employee.id,
      { status: CompanyEmployeeStatus.Deleted },
    );

    if (updateStatusResult.affected === 0) {
      throw new InternalServerErrorException("Не удалось удалить пользователя");
    }

    return {
      message: `Cотрудник c ${user.id} был успешно удален`,
      succes: true,
    };
  }

  private async checkUserPermissions(request: Request, id: number) {
    const token = this.authTokenService.extractToken(request);
    const role = await this.authTokenService.getUserRole(token);
    const roleNames = role.roles || [role.role];

    if (
      !this.hasAnyRole(roleNames, [
        RoleTypes.Partner,
        RoleTypes.EmployeeAdmin,
        RoleTypes.CompanyAdmin,
      ])
    ) {
      throw new HttpException(
        "У вас нет прав для данного действия",
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await this.userRepository.findByIdWithCompanyEmployees(id);

    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }

    if (
      ![RoleTypes.Employee, RoleTypes.EmployeeAdmin].includes(
        user.role.name as RoleTypes,
      ) &&
      !this.hasAnyRole(
        user.roles?.map((item) => item.name) || [],
        [
          RoleTypes.CompanyAdmin,
          RoleTypes.SalesManager,
          RoleTypes.TechnicalSpecialist,
          RoleTypes.Staff,
        ],
      )
    ) {
      throw new HttpException(
        "Только сотрудникам можно менять статус",
        HttpStatus.FORBIDDEN,
      );
    }

    return { user, role };
  }

  private hasAnyRole(userRoleNames: string[], roleNames: RoleTypes[]) {
    return roleNames.some((roleName) => userRoleNames.includes(roleName));
  }

  private async assertNotLastCompanyAdmin(user: UserEntity) {
    const userRoles = user.roles?.map((role) => role.name) || [];

    if (
      !this.hasAnyRole(userRoles, [
        RoleTypes.CompanyAdmin,
        RoleTypes.Partner,
        RoleTypes.EmployeeAdmin,
      ])
    ) {
      return;
    }

    const companyEmployee =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        user.id,
      );

    if (!companyEmployee) return;

    const employees =
      await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(
        companyEmployee.company_id,
      );
    const activeAdmins = employees.filter((employee) => {
      const roleNames = [
        employee.employee?.role?.name,
        ...(employee.employee?.roles || []).map((role) => role.name),
      ].filter(Boolean);

      return (
        employee.status === CompanyEmployeeStatus.Accept &&
        employee.employee_id !== user.id &&
        this.hasAnyRole(roleNames, [
          RoleTypes.CompanyAdmin,
          RoleTypes.Partner,
          RoleTypes.EmployeeAdmin,
        ])
      );
    });

    if (!activeAdmins.length) {
      throw new BadRequestException(
        "Нельзя удалить или понизить последнего администратора компании",
      );
    }
  }
}
