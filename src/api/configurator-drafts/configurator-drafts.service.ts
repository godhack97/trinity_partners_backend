import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
  CompanyRepository,
  CompanyEmployeeRepository,
  ConfiguratorDraftRepository,
  UserRepository,
} from "@orm/repositories";
import {
  CompanyEmployeeStatus,
  CompanyStatus,
  PartnershipType,
  UserEntity,
} from "@orm/entities";
import { NotificationService } from "@api/notification/notification.service";
import { CreateConfiguratorDraftDto } from "./dto/request/create-configurator-draft.dto";
import { UpdateConfiguratorDraftDto } from "./dto/request/update-configurator-draft.dto";
import { ShareConfiguratorDraftDto } from "./dto/request/share-configurator-draft.dto";
import { isBuiltInSuperAdminEmail } from "@app/security/built-in-super-admin";
import { RoleTypes } from "@app/types/RoleTypes";
import { In, IsNull } from "typeorm";
import {
  ShareRecipientResponseDto,
  ShareRecipientType,
} from "./dto/response/share-recipient-response.dto";

@Injectable()
export class ConfiguratorDraftsService {
  constructor(
    private readonly draftRepository: ConfiguratorDraftRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async getShareRecipients(
    auth_user: UserEntity,
  ): Promise<ShareRecipientResponseDto[]> {
    const senderCompanies = await this.getAcceptedMemberships(auth_user.id);
    if (!senderCompanies.length) {
      throw new HttpException(
        "Не удалось определить компанию пользователя",
        HttpStatus.FORBIDDEN,
      );
    }

    const companyIds = senderCompanies.map(({ company_id }) => company_id);
    const companyEmployees =
      await this.companyEmployeeRepository.findCompanyEmployeesByCompanyIds(
        companyIds,
      );
    const integratorCompanies =
      await this.getAcceptedIntegratorCompanies(companyIds);
    const managerIds = integratorCompanies
      .map(({ responsible_manager_id }) => responsible_manager_id)
      .filter((id): id is number => Boolean(id));

    const [responsibleManagers, technicalSpecialists] = await Promise.all([
      this.findActiveUsersByIds(managerIds),
      integratorCompanies.length
        ? this.findActiveTechnicalSpecialists()
        : Promise.resolve([]),
    ]);

    const recipients = new Map<number, ShareRecipientResponseDto>();
    for (const membership of companyEmployees) {
      if (
        membership.status !== CompanyEmployeeStatus.Accept ||
        membership.employee_id === auth_user.id ||
        !membership.employee?.is_activated
      ) {
        continue;
      }
      recipients.set(
        membership.employee_id,
        this.toShareRecipient(
          membership.employee,
          ShareRecipientType.CompanyEmployee,
        ),
      );
    }

    for (const manager of responsibleManagers) {
      if (manager.id === auth_user.id) continue;
      recipients.set(
        manager.id,
        this.toShareRecipient(manager, ShareRecipientType.ResponsibleManager),
      );
    }

    for (const specialist of technicalSpecialists) {
      if (specialist.id === auth_user.id || recipients.has(specialist.id)) {
        continue;
      }
      recipients.set(
        specialist.id,
        this.toShareRecipient(
          specialist,
          ShareRecipientType.TechnicalSpecialist,
        ),
      );
    }

    return [...recipients.values()].sort((left, right) =>
      left.full_name.localeCompare(right.full_name, "ru"),
    );
  }

  async findAll(auth_user: UserEntity) {
    return this.draftRepository.findByCreatorId(auth_user.id);
  }

  async findOne(id: number, auth_user: UserEntity) {
    const draft = await this.draftRepository.findById(id);

    if (!draft) {
      throw new HttpException("Конфигурация не найдена", HttpStatus.NOT_FOUND);
    }

    if (draft.creator_id !== auth_user.id) {
      throw new HttpException(
        "У вас нет доступа к этой конфигурации",
        HttpStatus.FORBIDDEN,
      );
    }

    return draft;
  }

  async create(auth_user: UserEntity, dto: CreateConfiguratorDraftDto) {
    const draft = await this.draftRepository.save({
      creator_id: auth_user.id,
      title: dto.title,
      server_id: dto.server_id,
      serverbox_height_id: dto.serverbox_height_id,
      components: dto.components || [],
      total_price: dto.total_price || 0,
      description: dto.description,
    });

    return draft;
  }

  async update(
    id: number,
    auth_user: UserEntity,
    dto: UpdateConfiguratorDraftDto,
  ) {
    const draft = await this.findOne(id, auth_user);

    await this.draftRepository.update(draft.id, {
      ...dto,
    });

    return this.draftRepository.findById(draft.id);
  }

  async duplicate(id: number, auth_user: UserEntity) {
    const original = await this.findOne(id, auth_user);

    const copy = await this.draftRepository.save({
      creator_id: auth_user.id,
      title: `${original.title} (копия)`,
      server_id: original.server_id,
      serverbox_height_id: original.serverbox_height_id,
      components: original.components,
      total_price: original.total_price,
      description: original.description,
    });

    return copy;
  }

  async share(
    id: number,
    auth_user: UserEntity,
    dto: ShareConfiguratorDraftDto,
  ) {
    const original = await this.findOne(id, auth_user);

    if (dto.employee_id === auth_user.id) {
      throw new HttpException(
        "Нельзя поделиться конфигурацией с самим собой",
        HttpStatus.BAD_REQUEST,
      );
    }

    const recipient = await this.userRepository.findOne({
      where: {
        id: dto.employee_id,
        is_activated: true,
        deleted_at: IsNull(),
      },
      relations: ["role", "user_roles", "user_roles.role", "user_info"],
    });
    if (!recipient) {
      throw new HttpException(
        "Получатель не найден или неактивен",
        HttpStatus.FORBIDDEN,
      );
    }

    const recipientCompanies = await this.getAcceptedMemberships(
      dto.employee_id,
    );

    if (!isBuiltInSuperAdminEmail(auth_user.email)) {
      const senderCompanies = await this.getAcceptedMemberships(auth_user.id);

      if (!senderCompanies.length) {
        throw new HttpException(
          "Не удалось определить компанию пользователя",
          HttpStatus.FORBIDDEN,
        );
      }

      const senderCompanyIds = new Set(
        senderCompanies.map(({ company_id }) => company_id),
      );
      const hasSharedCompany = recipientCompanies.some(({ company_id }) =>
        senderCompanyIds.has(company_id),
      );

      const integratorCompanies = await this.getAcceptedIntegratorCompanies([
        ...senderCompanyIds,
      ]);
      const isResponsibleManager = integratorCompanies.some(
        ({ responsible_manager_id }) =>
          responsible_manager_id === dto.employee_id,
      );
      const isTechnicalSpecialist =
        integratorCompanies.length > 0 &&
        this.hasRole(recipient, RoleTypes.TechnicalSpecialist);

      if (
        !hasSharedCompany &&
        !isResponsibleManager &&
        !isTechnicalSpecialist
      ) {
        throw new HttpException(
          "Получатель недоступен для отправки конфигурации",
          HttpStatus.FORBIDDEN,
        );
      }
    } else if (!recipientCompanies.length) {
      throw new HttpException(
        "Не удалось определить компанию пользователя",
        HttpStatus.FORBIDDEN,
      );
    }

    const copy = await this.draftRepository.save({
      creator_id: dto.employee_id,
      shared_by_id: auth_user.id,
      title: original.title,
      server_id: original.server_id,
      serverbox_height_id: original.serverbox_height_id,
      components: original.components,
      total_price: original.total_price,
      description: original.description,
    });

    await this.notificationService.send({
      user_id: dto.employee_id,
      title: "Вам отправили конфигурацию",
      text: `Конфигурация «${original.title}» добавлена в ваши черновики.`,
      webOnly: true,
      actions: [
        {
          label: "Открыть конфигурацию",
          url: copy.server_id
            ? `/configurator/${copy.server_id}?draft=${copy.id}`
            : `/configurator?draft=${copy.id}`,
        },
      ],
    });

    return this.draftRepository.findById(copy.id);
  }

  async remove(id: number, auth_user: UserEntity) {
    const draft = await this.findOne(id, auth_user);
    await this.draftRepository.softDelete(draft.id);
  }

  async getCount(auth_user: UserEntity): Promise<number> {
    return this.draftRepository.count({
      where: { creator_id: auth_user.id },
    });
  }

  private getAcceptedMemberships(employeeId: number) {
    return this.companyEmployeeRepository.find({
      where: {
        employee_id: employeeId,
        status: CompanyEmployeeStatus.Accept,
      },
    });
  }

  private getAcceptedIntegratorCompanies(companyIds: number[]) {
    if (!companyIds.length) return Promise.resolve([]);
    return this.companyRepository.find({
      where: {
        id: In(companyIds),
        partnership_type: PartnershipType.Integrator,
        status: CompanyStatus.Accept,
      },
      select: {
        id: true,
        responsible_manager_id: true,
      },
    });
  }

  private findActiveUsersByIds(ids: number[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.userRepository.find({
      where: {
        id: In(ids),
        is_activated: true,
        deleted_at: IsNull(),
      },
      relations: ["user_info", "role", "user_roles", "user_roles.role"],
    });
  }

  private findActiveTechnicalSpecialists() {
    return this.userRepository
      .createQueryBuilder("user")
      .distinct(true)
      .leftJoinAndSelect("user.user_info", "user_info")
      .leftJoinAndSelect("user.role", "primary_role")
      .leftJoinAndSelect("user.user_roles", "user_role")
      .leftJoinAndSelect("user_role.role", "secondary_role")
      .where("user.deleted_at IS NULL")
      .andWhere("user.is_activated = :active", { active: true })
      .andWhere("(primary_role.name = :role OR secondary_role.name = :role)", {
        role: RoleTypes.TechnicalSpecialist,
      })
      .getMany();
  }

  private hasRole(user: UserEntity, role: RoleTypes) {
    return [
      user.role?.name,
      ...(user.user_roles || []).map(
        ({ role: assignedRole }) => assignedRole?.name,
      ),
    ].includes(role);
  }

  private toShareRecipient(
    user: UserEntity,
    recipientType: ShareRecipientType,
  ): ShareRecipientResponseDto {
    const fullName = [user.user_info?.first_name, user.user_info?.last_name]
      .filter(Boolean)
      .join(" ");

    return {
      id: user.id,
      full_name: fullName || user.email,
      email: user.email,
      job_title: user.user_info?.job_title || null,
      recipient_type: recipientType,
    };
  }
}
