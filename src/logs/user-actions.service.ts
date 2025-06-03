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

  async log(user_id: number, action: string, details: object = {}) {
    const log = this.userActionRepo.create({ user_id, action, details });
    await this.userActionRepo.save(log);
  }
}
