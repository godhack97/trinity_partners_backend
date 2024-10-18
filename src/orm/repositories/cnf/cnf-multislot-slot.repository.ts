import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { CnfMultislotSlotEntity } from "../../entities";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class CnfMultislotSlotRepository extends Repository<CnfMultislotSlotEntity> {
  constructor(
    @InjectRepository(CnfMultislotSlotEntity)
    private repo: Repository<CnfMultislotSlotEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
