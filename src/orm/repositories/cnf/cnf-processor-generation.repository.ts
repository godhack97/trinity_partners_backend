import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CnfProcessorGeneration } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class CnfProcessorGenerationRepository extends Repository<CnfProcessorGeneration> {
  constructor(
    @InjectRepository(CnfProcessorGeneration)
    private repo: Repository<CnfProcessorGeneration>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
