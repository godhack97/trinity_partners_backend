import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ForbiddenInn } from "../entities/forbidden-inn.entity";

@Injectable()
export class ForbiddenInnRepository extends Repository<ForbiddenInn> {
  constructor(
    @InjectRepository(ForbiddenInn)
    private repository: Repository<ForbiddenInn>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async findByInn(inn: string): Promise<ForbiddenInn | null> {
    return await this.findOneBy({ inn });
  }
}
