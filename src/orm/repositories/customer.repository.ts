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

  public async findSimilar(inn: string, email: string, firstName: string, lastName: string) {
    return await this.createQueryBuilder('customer')
      .where('customer.inn = :inn', { inn })
      .orWhere('customer.email = :email', { email })
      .orWhere('(customer.first_name LIKE :firstName AND customer.last_name LIKE :lastName)', {
        firstName: `%${firstName}%`,
        lastName: `%${lastName}%`
      })
      .getOne();
  }
}