import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAction } from './user-action.entity';

@Injectable()
export class UserActionsService {
  constructor(
    @InjectRepository(UserAction)
    private readonly userActionRepo: Repository<UserAction>,
  ) {}

  async log(userId: number, action: string, details: object = {}) {
    const log = this.userActionRepo.create({ userId, action, details });
    await this.userActionRepo.save(log);
  }
}
