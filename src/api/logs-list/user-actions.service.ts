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

    @InjectRepository(entities.DistributorEntity)
    private readonly DistributorRepo: Repository<entities.DistributorEntity>,

    @InjectRepository(entities.NewsEntity)
    private readonly NewsRepo: Repository<entities.NewsEntity>,

    @InjectRepository(entities.NotificationEntity)
    private readonly NotificationRepo: Repository<entities.NotificationEntity>,

    @InjectRepository(entities.RoleEntity)
    private readonly RoleRepo: Repository<entities.RoleEntity>,

    @InjectRepository(entities.UserInfoEntity)
    private readonly UserInfoRepo: Repository<entities.UserInfoEntity>,

    @InjectRepository(entities.UserEntity)
    private readonly UserRepo: Repository<entities.UserEntity>,

    @InjectRepository(entities.CnfComponentEntity)
    private readonly CnfComponentRepo: Repository<entities.CnfComponentEntity>,

    @InjectRepository(entities.CnfComponentBackup)
    private readonly CnfComponentBackupRepo: Repository<entities.CnfComponentBackup>,

    @InjectRepository(entities.CnfMultislotEntity)
    private readonly CnfMultislotRepo: Repository<entities.CnfMultislotEntity>,

    @InjectRepository(entities.CnfProcessorGeneration)
    private readonly CnfProcessorGenerationRepo: Repository<entities.CnfProcessorGeneration>,

    @InjectRepository(entities.CnfServerEntity)
    private readonly CnfServerRepo: Repository<entities.CnfServerEntity>,

    @InjectRepository(entities.CnfServerGeneration)
    private readonly CnfServerGenerationRepo: Repository<entities.CnfServerGeneration>,

    @InjectRepository(entities.CnfServerboxHeightEntity)
    private readonly CnfServerboxHeightRepo: Repository<entities.CnfServerboxHeightEntity>,

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
      configurator_component: { repo: this.companyEmployeeRepo, field: "name" },
      users: { repo: this.UserRepo, field: "email" },
      company_employees: { repo: this.companyEmployeeRepo, field: "company" },
      companies: { repo: this.CompanyRepo, field: "name" },
      deals: { repo: this.DealRepo, field: "deal_num" },
      distributors: { repo: this.DistributorRepo, field: "name" },
      news: { repo: this.NewsRepo, field: "name" },
      notifications: { repo: this.NotificationRepo, field: "title" },
      roles: { repo: this.RoleRepo, field: "name" },
      cnf_components: { repo: this.CnfComponentRepo, field: "name" },
      cnf_multislots: { repo: this.CnfMultislotRepo, field: "name" },
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
      cnf_slots: { repo: this.CnfSlotRepo, field: "name" },
      cnf_component_backups: {
        repo: this.CnfComponentBackupRepo,
        field: (entity) => `${entity.name} ${entity.components_count}шт`
      },
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

  async findByEntity(entity, entityId) {
    const logs = await this.userActionRepo
      .createQueryBuilder("action")
      .leftJoinAndSelect("action.user", "user")
      .where("JSON_EXTRACT(action.details, '$.entity') = :entity", { entity })
      .andWhere(
        "(JSON_EXTRACT(action.details, '$.params.id') = :entityId OR JSON_EXTRACT(action.details, '$.body.id') = :entityId)",
        { entityId }
      )
      .orderBy("action.created_at", "DESC")
      .getMany();
  
    return Promise.all(logs.map((log) => this.structureEntityLog(log)));
  }
  
  private async structureEntityLog(log) {
    const enriched = await this.enrichLogWithEntity(log);
    const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
  
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
  
    const changes = this.extractChanges(details);
  
    return {
      название: enriched.actionLabel,
      поля: changes,
      кем: userName,
      когда: this.getRelativeTime(log.created_at),
      дата: log.created_at,
    };
  }
  
  private extractChanges(details) {
    const changes = {};
  
    if (!details.body || !details.query) {
      return changes;
    }
  
    const oldValues = details.query;
    const newValues = details.body;
  
    for (const key in newValues) {
      if (oldValues.hasOwnProperty(key) && oldValues[key] !== newValues[key]) {
        changes[key] = [oldValues[key], newValues[key]];
      }
    }
  
    return changes;
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
      return `${day} ${month} ${year}`;
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
