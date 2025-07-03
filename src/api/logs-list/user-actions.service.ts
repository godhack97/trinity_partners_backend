import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { UserAction } from 'src/logs/user-action.entity';
import { UserActionLabels } from './user-actions.enum';
import * as entities from 'src/orm/entities';

type FieldType = string | ((entity: any) => string);

@Injectable()
export class UserActionsService {
  private entityRepoMap: Record<string, { repo: Repository<any>, field: FieldType }>;

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
      configurator_component: { repo: this.companyEmployeeRepo, field: 'name' },
      users: { repo: this.UserRepo, field: 'email' },
      company_employees: { repo: this.companyEmployeeRepo, field: 'company' },
      companies: { repo: this.CompanyRepo, field: 'name' },
      deals: { repo: this.DealRepo, field: 'deal_num' },
      distributors: { repo: this.DistributorRepo, field: 'name' },
      news: { repo: this.NewsRepo, field: 'name' },
      notifications: { repo: this.NotificationRepo, field: 'title' },
      roles: { repo: this.RoleRepo, field: 'name' },
      cnf_components: { repo: this.CnfComponentRepo, field: 'name' },
      cnf_multislots: { repo: this.CnfMultislotRepo, field: 'name' },
      cnf_processor_generation: { repo: this.CnfProcessorGenerationRepo, field: 'name' },
      cnf_servers: { repo: this.CnfServerRepo, field: 'name' },
      cnf_server_generation: { repo: this.CnfServerGenerationRepo, field: 'name' },
      cnf_serverbox_height: { repo: this.CnfServerboxHeightRepo, field: 'name' },
      cnf_slots: { repo: this.CnfSlotRepo, field: 'name' },
    };
  }

  async getCount(): Promise<number> {
    return await this.userActionRepo.count();
  }

  private async enrichLogWithEntity(log: UserAction) {
    let entityName = null;

    try {
      const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;

      if (
        details?.entity &&
        details?.params?.id &&
        this.entityRepoMap[details.entity]
      ) {
        const { repo, field } = this.entityRepoMap[details.entity];
        const entity = await repo.findOne({ where: { id: details.params.id } });
        if (entity) {
          entityName = typeof field === 'function' ? field(entity) : entity[field];
        } else if (details.deleted.name) {
          entityName = details.deleted.name;
        } else {
          entityName = `ID: ${details.params.id}`;
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

  async findAll(
    options: FindManyOptions<UserAction> = {},
  ): Promise<any[]> {
    const logs = await this.userActionRepo.find({
      order: { created_at: 'DESC' },
      relations: ['user'],
      ...options,
    });

    return Promise.all(logs.map(log => this.enrichLogWithEntity(log)));
  }

  async count(): Promise<number> {
    return this.userActionRepo.count();
  }

  async findPaged(skip = 0, take = 20): Promise<{ logs: any[]; total: number }> {
    const [logs, total] = await this.userActionRepo.findAndCount({
      order: { created_at: 'DESC' },
      relations: ['user'],
      skip,
      take,
    });

    return {
      logs: await Promise.all(logs.map(log => this.enrichLogWithEntity(log))),
      total
    };
  }

  async findPagedByAction(
    action: string,
    skip = 0,
    take = 20
  ): Promise<{ logs: any[]; total: number }> {
    const [logs, total] = await this.userActionRepo.findAndCount({
      where: { action },
      order: { created_at: 'DESC' },
      relations: ['user'],
      skip,
      take,
    });

    return {
      logs: await Promise.all(logs.map(log => this.enrichLogWithEntity(log))),
      total
    };
  }
}
