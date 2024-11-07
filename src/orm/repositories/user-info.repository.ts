import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserInfoEntity } from "@orm/entities";

@Injectable()
export class UserInfoRepository extends Repository<UserInfoEntity> {
  constructor(
    @InjectRepository(UserInfoEntity)
    private repo: Repository<UserInfoEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findAll(): Promise<UserInfoEntity[]> {
    return await this.find();
  }
}
