import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomerEntity } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class CustomerRepository extends Repository<CustomerEntity> {
  constructor(
    @InjectRepository(CustomerEntity)
    private repo: Repository<CustomerEntity>,
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