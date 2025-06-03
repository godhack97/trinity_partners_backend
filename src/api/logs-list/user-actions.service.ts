import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { UserAction } from 'src/logs/user-action.entity';
import {UserActionLabels} from './user-actions.enum'

@Injectable()
export class UserActionsService {
  constructor(
    @InjectRepository(UserAction)
    private readonly userActionRepo: Repository<UserAction>,
  ) {}

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
    return logs.map(this.mapActionLabel);
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
    return { logs: logs.map(this.mapActionLabel), total };
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
    return { logs: logs.map(this.mapActionLabel), total };
  }
}
