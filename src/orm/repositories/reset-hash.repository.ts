import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResetHashEntity } from "@orm/entities";

@Injectable()
export class ResetHashRepository extends Repository<ResetHashEntity> {
  constructor(
    @InjectRepository(ResetHashEntity)
    private repo: Repository<ResetHashEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findByHash(hash: string): Promise<ResetHashEntity> {
    return await this.findOneBy({ hash });
  }
}
