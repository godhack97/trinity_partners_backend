import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions } from "typeorm";
import { UserAction } from "src/logs/user-action.entity";
import { UserActionLabels } from "./user-actions.enum";
import * as entities from "src/orm/entities";

type FieldType = string | ((entity: any) => string);

@Injectable()
export class UserActionsService {
  private entityRepoMap: Record<
    string,
    { repo: Repository<any>; field: FieldType }
  >;

  constructor(
    @InjectRepository(UserAction)
    private readonly userActionRepo: Repository<UserAction>,

    @InjectRepository(entities.CompanyEmployeeEntity)
    private readonly companyEmployeeRepo: Repository<entities.CompanyEmployeeEntity>,

    @InjectRepository(entities.CompanyEntity)
    private readonly CompanyRepo: Repository<entities.CompanyEntity>,

    @InjectRepository(entities.CustomerEntity)
    private readonly CustomerRepo: Repository<entities.CustomerEntity>,

    @InjectRepository(entities.DealEntity)
    private readonly DealRepo: Repository<entities.DealEntity>,

    @InjectRepository(entities.DealDeletionRequestEntity)
    private readonly DealDeletionRequestRepo: Repository<entities.DealDeletionRequestEntity>,

    @InjectRepository(entities.DistributorEntity)
    private readonly DistributorRepo: Repository<entities.DistributorEntity>,

    @InjectRepository(entities.NewsEntity)
    private readonly NewsRepo: Repository<entities.NewsEntity>,

    @InjectRepository(entities.NotificationEntity)
    private readonly NotificationRepo: Repository<entities.NotificationEntity>,

    @InjectRepository(entities.RoleEntity)
    private readonly RoleRepo: Repository<entities.RoleEntity>,

    @InjectRepository(entities.Permission)
    private readonly PermissionRepo: Repository<entities.Permission>,

    @InjectRepository(entities.RolePermission)
    private readonly RolePermissionRepo: Repository<entities.RolePermission>,

    @InjectRepository(entities.UserInfoEntity)
    private readonly UserInfoRepo: Repository<entities.UserInfoEntity>,

    @InjectRepository(entities.UserEntity)
    private readonly UserRepo: Repository<entities.UserEntity>,

    @InjectRepository(entities.UserRoleEntity)
    private readonly UserRoleRepo: Repository<entities.UserRoleEntity>,

    @InjectRepository(entities.UserSettingEntity)
    private readonly UserSettingRepo: Repository<entities.UserSettingEntity>,

    @InjectRepository(entities.UserTableSettingsEntity)
    private readonly UserTableSettingsRepo: Repository<entities.UserTableSettingsEntity>,

    @InjectRepository(entities.UserToken)
    private readonly UserTokenRepo: Repository<entities.UserToken>,

    @InjectRepository(entities.ResetHashEntity)
    private readonly ResetHashRepo: Repository<entities.ResetHashEntity>,

    @InjectRepository(entities.ForbiddenInn)
    private readonly ForbiddenInnRepo: Repository<entities.ForbiddenInn>,

    @InjectRepository(entities.CnfComponentEntity)
    private readonly CnfComponentRepo: Repository<entities.CnfComponentEntity>,

    @InjectRepository(entities.CnfComponentBackup)
    private readonly CnfComponentBackupRepo: Repository<entities.CnfComponentBackup>,

    @InjectRepository(entities.CnfComponentBackupData)
    private readonly CnfComponentBackupDataRepo: Repository<entities.CnfComponentBackupData>,

    @InjectRepository(entities.CnfComponentSlotEntity)
    private readonly CnfComponentSlotRepo: Repository<entities.CnfComponentSlotEntity>,

    @InjectRepository(entities.CnfComponentTypeEntity)
    private readonly CnfComponentTypeRepo: Repository<entities.CnfComponentTypeEntity>,

    @InjectRepository(entities.CnfMultislotEntity)
    private readonly CnfMultislotRepo: Repository<entities.CnfMultislotEntity>,

    @InjectRepository(entities.CnfMultislotSlotEntity)
    private readonly CnfMultislotSlotRepo: Repository<entities.CnfMultislotSlotEntity>,

    @InjectRepository(entities.CnfProcessorGeneration)
    private readonly CnfProcessorGenerationRepo: Repository<entities.CnfProcessorGeneration>,

    @InjectRepository(entities.CnfServerEntity)
    private readonly CnfServerRepo: Repository<entities.CnfServerEntity>,

    @InjectRepository(entities.CnfServerGeneration)
    private readonly CnfServerGenerationRepo: Repository<entities.CnfServerGeneration>,

    @InjectRepository(entities.CnfServerboxHeightEntity)
    private readonly CnfServerboxHeightRepo: Repository<entities.CnfServerboxHeightEntity>,

    @InjectRepository(entities.CnfServerMultislotEntity)
    private readonly CnfServerMultislotRepo: Repository<entities.CnfServerMultislotEntity>,

    @InjectRepository(entities.CnfServerSlotEntity)
    private readonly CnfServerSlotRepo: Repository<entities.CnfServerSlotEntity>,

    @InjectRepository(entities.CnfSlotEntity)
    private readonly CnfSlotRepo: Repository<entities.CnfSlotEntity>,
  ) {
    this.entityRepoMap = {
      customers: {
        repo: this.CustomerRepo,
        field: (entity) => `${entity.first_name} ${entity.last_name}`,
      },
      users_info: {
        repo: this.UserInfoRepo,
        field: (entity) => `${entity.first_name} ${entity.last_name}`,
      },
      configurator_component: { repo: this.CnfComponentRepo, field: "name" },
      users: { repo: this.UserRepo, field: "email" },
      company_employees: { repo: this.companyEmployeeRepo, field: "company" },
      companies: { repo: this.CompanyRepo, field: "name" },
      deals: { repo: this.DealRepo, field: "deal_num" },
      deal_deletion_requests: {
        repo: this.DealDeletionRequestRepo,
        field: "deletion_reason"
      },
      distributors: { repo: this.DistributorRepo, field: "name" },
      news: { repo: this.NewsRepo, field: "name" },
      notifications: { repo: this.NotificationRepo, field: "title" },
      roles: { repo: this.RoleRepo, field: "name" },
      permissions: { repo: this.PermissionRepo, field: "name" },
      role_permissions: {
        repo: this.RolePermissionRepo,
        field: (entity) => `Роль: ${entity.role_id}, Право: ${entity.permission_id}`
      },
      user_roles: {
        repo: this.UserRoleRepo,
        field: (entity) => `User ID: ${entity.user_id}`
      },
      user_settings: {
        repo: this.UserSettingRepo,
        field: (entity) => `${entity.type}: ${entity.value}`
      },
      user_table_settings: {
        repo: this.UserTableSettingsRepo,
        field: "table_id"
      },
      user_tokens: {
        repo: this.UserTokenRepo,
        field: "client_id"
      },
      reset_hashs: {
        repo: this.ResetHashRepo,
        field: "email"
      },
      forbidden_inns: {
        repo: this.ForbiddenInnRepo,
        field: "inn"
      },
      cnf_components: { repo: this.CnfComponentRepo, field: "name" },
      cnf_component_backups: {
        repo: this.CnfComponentBackupRepo,
        field: (entity) => `${entity.name} ${entity.components_count}шт`
      },
      cnf_component_backup_data: {
        repo: this.CnfComponentBackupDataRepo,
        field: "backup_id"
      },
      cnf_component_slots: {
        repo: this.CnfComponentSlotRepo,
        field: (entity) => `Слот: ${entity.slot_id}, Компонент: ${entity.component_id}`
      },
      cnf_component_types: { repo: this.CnfComponentTypeRepo, field: "name" },
      cnf_multislots: { repo: this.CnfMultislotRepo, field: "name" },
      cnf_multislot_slots: {
        repo: this.CnfMultislotSlotRepo,
        field: (entity) => `Мультислот: ${entity.multislot_id}, Слот: ${entity.slot_id}`
      },
      cnf_processor_generation: {
        repo: this.CnfProcessorGenerationRepo,
        field: "name",
      },
      cnf_servers: { repo: this.CnfServerRepo, field: "name" },
      cnf_server_generation: {
        repo: this.CnfServerGenerationRepo,
        field: "name",
      },
      cnf_serverbox_height: {
        repo: this.CnfServerboxHeightRepo,
        field: "name",
      },
      cnf_server_multislots: {
        repo: this.CnfServerMultislotRepo,
        field: (entity) => `Сервер: ${entity.server_id}, Мультислот: ${entity.multislot_id}`
      },
      cnf_server_slots: {
        repo: this.CnfServerSlotRepo,
        field: (entity) => `Сервер: ${entity.server_id}, Слот: ${entity.slot_id}`
      },
      cnf_slots: { repo: this.CnfSlotRepo, field: "name" },
    };
  }

  async getCount(): Promise<number> {
    return await this.userActionRepo.count();
  }

  private async enrichLogWithEntity(log: UserAction) {
    let entityName = null;

    try {
      const details =
        typeof log.details === "string" ? JSON.parse(log.details) : log.details;

      const entityId = details?.params?.backupId || details?.params?.id;

      if (
        details?.entity &&
        entityId &&
        this.entityRepoMap[details.entity]
      ) {
        const { repo, field } = this.entityRepoMap[details.entity];
        const entity = await repo.findOne({ where: { id: entityId } });

        if (entity) {
          entityName =
            typeof field === "function" ? field(entity) : entity[field];
        } else if (details.deleted.name) {
          entityName = details.deleted.name;
        } else {
          entityName = `ID: ${entityId}`;
        }
      }

      if (!entityName) {
        if (details?.body?.company_name) {
          entityName = details.body.company_name;
        } else if (details?.body?.name) {
          entityName = details.body.name;
        }
      }
    } catch (e) {
      // ignore
    }

    return {
      ...log,
      actionLabel: UserActionLabels[log.action] || log.action,
      entityName,
    };
  }

  private mapActionLabel(log: UserAction) {
    return {
      ...log,
      actionLabel: UserActionLabels[log.action] || log.action,
    };
  }

  async findAll(options: FindManyOptions<UserAction> = {}): Promise<any[]> {
    const logs = await this.userActionRepo.find({
      order: { created_at: "DESC" },
      relations: ["user"],
      ...options,
    });

    return Promise.all(logs.map((log) => this.enrichLogWithEntity(log)));
  }

  async count(): Promise<number> {
    return this.userActionRepo.count();
  }

  async findPaged(
    skip = 0,
    take = 20,
  ): Promise<{ logs: any[]; total: number }> {
    const [logs, total] = await this.userActionRepo.findAndCount({
      order: { created_at: "DESC" },
      relations: ["user"],
      skip,
      take,
    });

    return {
      logs: await Promise.all(logs.map((log) => this.enrichLogWithEntity(log))),
      total,
    };
  }

  async findEntityBackupOperations() {
    const bulkActions = [
      "configurator_component_export",
      "configurator_component_import",
      "configurator_component_backup",
      "configurator_component_restore_backup",
      "configurator_component_backup_delete",
    ];

    const logs = await this.userActionRepo
      .createQueryBuilder("action")
      .leftJoinAndSelect("action.user", "user")
      .andWhere("action.action IN (:...bulkActions)", { bulkActions })
      .orderBy("action.created_at", "DESC")
      .getMany();

    return Promise.all(logs.map((log) => this.structureEntityLog(log)));
  }

  async findByEntity(entity, entityId) {
    const queryBuilder = this.userActionRepo
      .createQueryBuilder("action")
      .leftJoinAndSelect("action.user", "user")
      .where("JSON_EXTRACT(action.details, '$.entity') = :entity", { entity });

    if (entityId) {
      queryBuilder.andWhere(
        "(JSON_EXTRACT(action.details, '$.params.id') = :entityId OR JSON_EXTRACT(action.details, '$.body.id') = :entityId)",
        { entityId }
      );
    } else {
      queryBuilder.andWhere(
        "(JSON_EXTRACT(action.details, '$.params.id') IS NULL AND JSON_EXTRACT(action.details, '$.body.id') IS NULL)"
      );
    }

    const logs = await queryBuilder
      .orderBy("action.created_at", "DESC")
      .getMany();

    return Promise.all(logs.map((log) => this.structureEntityLog(log)));
  }

  private async structureEntityLog(log) {
    const enriched = await this.enrichLogWithEntity(log);
    let details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;

    let userName = 'Неизвестный пользователь';

    if (log.user_id) {
      const userInfo = await this.UserInfoRepo.findOne({
        where: { user_id: log.user_id }
      });

      if (userInfo && userInfo.first_name && userInfo.last_name) {
        userName = `${userInfo.first_name} ${userInfo.last_name}`;
      } else {
        const user = await this.UserRepo.findOne({
          where: { id: log.user_id }
        });
        if (user && user.email) {
          userName = user.email;
        }
      }
    }

    if (details?.changes?.manager_id) {
      const managerOldInfo = await this.UserInfoRepo.findOne({
        where: { user_id: details?.changes?.manager_id?.old }
      });
      const managerNewInfo = await this.UserInfoRepo.findOne({
        where: { user_id: details?.changes?.manager_id?.new }
      });

      if (managerOldInfo && managerOldInfo.first_name && managerOldInfo.last_name) {
        details.changes.manager_id.old = `${managerOldInfo.first_name} ${managerOldInfo.last_name}`;
      }

      if (managerNewInfo && managerNewInfo.first_name && managerNewInfo.last_name) {
        details.changes.manager_id.new = `${managerNewInfo.first_name} ${managerNewInfo.last_name}`;
      }

      details.changes['Менеджер'] = details.changes.manager_id;
      delete details.changes.manager_id;
    }

    const changes = this.extractChanges(details);

    return {
      action: enriched.actionLabel,
      changes: changes,
      userName: userName,
      date_format: this.getRelativeTime(log.created_at),
      date: log.created_at,
    };
  }

  private extractChanges(details) {
    if (details.changes) {
      const formatted = {};
      for (const key in details.changes) {
        formatted[key] = [details.changes[key].old, details.changes[key].new];
      }
      return formatted;
    }

    return {};
  }

  private getRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const isToday = now.toDateString() === past.toDateString();

    if (!isToday) {
      const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      const day = past.getDate();
      const month = months[past.getMonth()];
      const year = past.getFullYear();
      const hours = past.getHours();
      const minutes = past.getMinutes();
      return `${day} ${month} ${year} в ${hours}:${minutes}`;
    }

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    return `${diffHours} ч назад`;
  }


  async findPagedByAction(
    action: string,
    skip = 0,
    take = 20,
  ): Promise<{ logs: any[]; total: number }> {
    const [logs, total] = await this.userActionRepo.findAndCount({
      where: { action },
      order: { created_at: "DESC" },
      relations: ["user"],
      skip,
      take,
    });

    return {
      logs: await Promise.all(logs.map((log) => this.enrichLogWithEntity(log))),
      total,
    };
  }
}
