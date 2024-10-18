import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserInfo } from '../entities/user-info.entity';

@Injectable()
export class UserInfoRepository extends Repository<UserInfo> {
  constructor(
    @InjectRepository(UserInfo)
    private repo: Repository<UserInfo>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findAll(): Promise<UserInfo[]> {
    return await this.find();
  }
}
