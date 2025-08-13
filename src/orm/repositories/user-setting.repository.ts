import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserInfoEntity, UserSettingEntity } from "@orm/entities";

@Injectable()
export class UserSettingRepository extends Repository<UserSettingEntity> {
  constructor(
    @InjectRepository(UserSettingEntity)
    private repo: Repository<UserSettingEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
