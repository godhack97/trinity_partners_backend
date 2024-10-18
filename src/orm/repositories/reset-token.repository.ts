import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ResetTokenEntity } from "../entities/reset-token.entity";

@Injectable()
export class ResetTokenRepository extends Repository<ResetTokenEntity> {
  constructor(
    @InjectRepository(ResetTokenEntity)
    private repo: Repository<ResetTokenEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findByToken(token: string): Promise<ResetTokenEntity> {
    return await this.findOneBy({ token });
  }
}
