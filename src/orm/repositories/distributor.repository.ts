import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DistributorEntity } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class DistributorRepository extends Repository<DistributorEntity> {
  constructor(
    @InjectRepository(DistributorEntity)
    private repo: Repository<DistributorEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findAll() {
    return await this.find();
  }

  public async findById(id: number) {
    return await this.findOneBy({ id });
  }
}