import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CnfMultislotEntity } from "../../entities";

@Injectable()
export class CnfMultislotRepository extends Repository<CnfMultislotEntity> {
  constructor(
    @InjectRepository(CnfMultislotEntity)
    private repo: Repository<CnfMultislotEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
