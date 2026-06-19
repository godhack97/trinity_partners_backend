import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { NotificationService } from "@api/notification/notification.service";
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
import {
  CompanyEmployeeStatus,
  DealEntity,
  DealStatus,
  NotificationCategory,
  UserEntity,
} from "@orm/entities";
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
import { In, Not, Repository } from "typeorm";

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
    private readonly notificationService: NotificationService,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
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

    if (employeeCompany.status === CompanyEmployeeStatus.TrinityPending) {
      throw new BadRequestException(
        "Заявка сотрудника ожидает проверки менеджером Тринити",
      );
    }

    if (
      ![
        CompanyEmployeeStatus.Pending,
        CompanyEmployeeStatus.CompanyPending,
        CompanyEmployeeStatus.Invited,
      ].includes(employeeCompany.status)
    ) {
      throw new BadRequestException("Заявка сотрудника не может быть подтверждена");
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

  async inviteEmployee(
    auth_user: UserEntity,
    addEmployeeDto: AddEmployeeRequestDto,
  ) {
    const user = await this.userRepository.findByEmailWithCompanyEmployees(
      addEmployeeDto.email,
    );

    if (!user) {
      throw new BadRequestException(
        "Пользователь с такой электронной почтой не найден. Сотрудник должен сначала зарегистрироваться на портале.",
      );
    }

    if (user.role.name !== RoleTypes.Employee) {
      throw new BadRequestException(
        "Этот пользователь не может быть приглашен как сотрудник",
      );
    }

    const authUserCompany =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        auth_user.id,
      );
    if (!authUserCompany) {
      throw new ForbiddenException("Компания администратора не найдена");
    }

    const employeeCompany =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        user.id,
      );

    if (employeeCompany && employeeCompany.company_id !== authUserCompany.company_id) {
      throw new ForbiddenException(
        "Этот сотрудник уже присоединен к другой компании",
      );
    }

    if (employeeCompany?.status === CompanyEmployeeStatus.Accept) {
      throw new BadRequestException("Этот сотрудник уже добавлен в компанию");
    }

    if (employeeCompany) {
      await this.companyEmployeeRepository.update(employeeCompany.id, {
        status: CompanyEmployeeStatus.InviteTrinityPending,
      });
    } else {
      await this.companyEmployeeRepository.save({
        company_id: authUserCompany.company_id,
        employee_id: user.id,
        status: CompanyEmployeeStatus.InviteTrinityPending,
      });
    }

    await this.notifyTrinityManagerAboutEmployeeInvite(
      authUserCompany.company_id,
      user,
    );

    return { success: true, status: CompanyEmployeeStatus.InviteTrinityPending };
  }

  private async notifyTrinityManagerAboutEmployeeInvite(
    companyId: number,
    employee: UserEntity,
  ) {
    const company = await this.companyRepository.findOneBy({ id: companyId });
    if (!company) return;

    const owner = await this.userRepository.findById(company.owner_id);
    const managerId = company.validated_by_manager_id || owner?.manager_id;
    if (!managerId) return;

    const manager = await this.userRepository.findById(managerId);
    if (!manager) return;

    const employeeName =
      [employee.user_info?.first_name, employee.user_info?.last_name]
        .filter(Boolean)
        .join(" ") || employee.email;

    await this.emailConfirmerService.emailSend({
      email: manager.email,
      subject: "Новое приглашение сотрудника на проверку",
      template: "partner-new-employee-notification",
      context: {
        partnerName: "Менеджер Тринити",
        companyName: company.name,
        employeeFirstName: employee.user_info?.first_name,
        employeeLastName: employee.user_info?.last_name,
        employeeEmail: employee.email,
        employeeJobTitle: employee.user_info?.job_title,
        employeePhone: employee.user_info?.phone,
        registrationDate: new Date().toLocaleDateString("ru-RU"),
        link: "https://partner.trinity.ru/",
      },
    });

    await this.notificationService.send({
      user_id: manager.id,
      title: "Приглашение сотрудника на проверку",
      text: `${employeeName} приглашён в компанию ${company.name} и ожидает проверки менеджером Тринити.`,
      category: NotificationCategory.Company,
      actions: [
        {
          label: "Открыть заявки",
          url: "/employee.management",
        },
      ],
    });
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
        RoleTypes.PartnerManager,
      ])
    ) {
      throw new HttpException(
        "У вас нет прав для данного действия",
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      this.hasAnyRole(roleNames, [RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
    ) {
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

    await this.setUserRole(user.id, newRoleName);

    return {
      message: `Роль сотрудника ${user.id} была успешно заменена на ${newRoleName}`,
      succes: true,
    };
  }

  async transferAdminRights(request: Request, id: number) {
    const { user: targetUser, role } = await this.checkUserPermissions(
      request,
      id,
    );

    if (targetUser.id === role.userId) {
      throw new BadRequestException(
        "Нельзя передать права администратора самому себе",
      );
    }

    const targetEmployee =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        targetUser.id,
      );
    const currentEmployee =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        role.userId,
      );

    if (
      !targetEmployee ||
      !currentEmployee ||
      targetEmployee.company_id !== currentEmployee.company_id
    ) {
      throw new ForbiddenException(
        "Права администратора можно передать только сотруднику своей компании",
      );
    }

    if (targetEmployee.status !== CompanyEmployeeStatus.Accept) {
      throw new BadRequestException(
        "Права администратора можно передать только активному сотруднику",
      );
    }

    await this.setUserRole(targetUser.id, RoleTypes.CompanyAdmin);
    await this.setUserRole(role.userId, RoleTypes.SalesManager);

    const company = await this.companyRepository.findOneBy({
      id: currentEmployee.company_id,
    });

    if (company?.owner_id === role.userId) {
      await this.companyRepository.update(company.id, {
        owner_id: targetUser.id,
      });
    }

    return {
      message: `Права администратора переданы сотруднику ${targetUser.id}`,
      succes: true,
    };
  }

  async removeEmployee(request: Request, id: number) {
    const { user } = await this.checkUserPermissions(request, id);
    await this.assertNotLastCompanyAdmin(user);
    const reassignment = await this.reassignActiveDealsToFirstCompanyAdmin(user);
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
      { status: CompanyEmployeeStatus.Blocked },
    );

    if (updateStatusResult.affected === 0) {
      throw new InternalServerErrorException("Не удалось удалить пользователя");
    }

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: "Доступ к компании заблокирован",
      template: "request-company-reject",
      context: {
        link: "https://partner.trinity.ru/",
      },
    });

    return {
      message: `Cотрудник c ${user.id} был успешно удален`,
      reassigned_deals_count: reassignment.reassignedDealsCount,
      reassigned_to_user_id: reassignment.adminUserId,
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

  private async setUserRole(userId: number, roleName: RoleTypes) {
    const role = await this.roleRepository.findByRole(roleName);
    if (!role) {
      throw new InternalServerErrorException(
        `Роль ${roleName} не найдена`,
      );
    }

    const updateResult = await this.userRepository.update(userId, {
      role,
    });

    await this.userRoleRepository.delete({ user_id: userId });
    await this.userRoleRepository.save({
      user_id: userId,
      role_id: role.id,
    });

    if (updateResult.affected === 0) {
      throw new InternalServerErrorException(
        "Не удалось обновить роль пользователя",
      );
    }
  }

  private async reassignActiveDealsToFirstCompanyAdmin(user: UserEntity) {
    const companyEmployee =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
        user.id,
      );

    if (!companyEmployee) {
      return { reassignedDealsCount: 0, adminUserId: null };
    }

    const activeDeals = await this.dealRepository.find({
      where: {
        creator_id: user.id,
        status: Not(In([DealStatus.Win, DealStatus.Lose])),
      },
    });

    if (!activeDeals.length) {
      return { reassignedDealsCount: 0, adminUserId: null };
    }

    const admin = await this.findFirstActiveCompanyAdmin(
      companyEmployee.company_id,
      user.id,
    );

    if (!admin) {
      throw new BadRequestException(
        "Не найден активный администратор компании для переназначения сделок",
      );
    }

    await this.dealRepository.update(
      { id: In(activeDeals.map((deal) => deal.id)) },
      { creator_id: admin.employee_id },
    );

    await this.notificationService.send({
      user_id: admin.employee_id,
      title: "Вам переназначены сделки сотрудника",
      text: `После блокировки сотрудника ${this.getUserDisplayName(user)} вам переназначены активные сделки: ${activeDeals.length}. Завершённые сделки остались за прежним сотрудником.`,
      category: NotificationCategory.Deal,
      actions: [
        {
          label: "Открыть сделки",
          url: "/deals.management",
        },
      ],
    });

    return {
      reassignedDealsCount: activeDeals.length,
      adminUserId: admin.employee_id,
    };
  }

  private async findFirstActiveCompanyAdmin(
    companyId: number,
    excludedUserId: number,
  ) {
    const employees =
      await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(
        companyId,
      );

    return employees
      .filter((employee) => {
        const roleNames = [
          employee.employee?.role?.name,
          ...(employee.employee?.roles || []).map((role) => role.name),
        ].filter(Boolean);

        return (
          employee.status === CompanyEmployeeStatus.Accept &&
          employee.employee_id !== excludedUserId &&
          this.hasAnyRole(roleNames, [
            RoleTypes.CompanyAdmin,
            RoleTypes.Partner,
            RoleTypes.EmployeeAdmin,
          ])
        );
      })
      .sort((a, b) => {
        const aTime = new Date(
          (a.employee?.created_at as unknown as string) || 0,
        ).getTime();
        const bTime = new Date(
          (b.employee?.created_at as unknown as string) || 0,
        ).getTime();

        return aTime - bTime || a.employee_id - b.employee_id;
      })[0];
  }

  private getUserDisplayName(user: UserEntity) {
    return (
      [user.user_info?.first_name, user.user_info?.last_name]
        .filter(Boolean)
        .join(" ") || user.email
    );
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
