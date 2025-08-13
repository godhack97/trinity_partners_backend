import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CnfServerGeneration } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class CnfServerGenerationRepository extends Repository<CnfServerGeneration> {
  constructor(
    @InjectRepository(CnfServerGeneration)
    private repo: Repository<CnfServerGeneration>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
