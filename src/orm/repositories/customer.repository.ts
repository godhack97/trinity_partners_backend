import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomerEntity } from "@orm/entities";
import { EntityManager, Repository } from "typeorm";

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

  public async findByNormalizedInn(innNormalized: string) {
    return this.findOne({
      where: { inn_normalized: innNormalized },
      order: { id: "ASC" },
    });
  }

  public async findBitrixCompanyIdByNormalizedInn(
    innNormalized: string,
    manager: EntityManager = this.manager,
  ) {
    return manager
      .getRepository(CustomerEntity)
      .createQueryBuilder("customer")
      .select("customer.bitrix24_company_id", "bitrix24_company_id")
      .where("customer.inn_normalized = :innNormalized", { innNormalized })
      .andWhere("customer.bitrix24_company_id IS NOT NULL")
      .orderBy("customer.id", "ASC")
      .getRawOne<{ bitrix24_company_id: number }>();
  }

  public async assignBitrixCompanyIdToNormalizedInn(
    innNormalized: string,
    bitrixCompanyId: number,
    manager: EntityManager = this.manager,
  ) {
    return manager
      .getRepository(CustomerEntity)
      .createQueryBuilder()
      .update(CustomerEntity)
      .set({ bitrix24_company_id: bitrixCompanyId })
      .where("inn_normalized = :innNormalized", { innNormalized })
      .execute();
  }

  public async withNormalizedInnRegistryLock<T>(
    innNormalized: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.manager.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO deal_customer_inn_registry
          (inn_normalized, canonical_deal_id, created_at, updated_at)
         VALUES (?, NULL, NOW(), NOW())
         ON DUPLICATE KEY UPDATE updated_at = updated_at`,
        [innNormalized],
      );
      await manager.query(
        `SELECT canonical_deal_id
         FROM deal_customer_inn_registry
         WHERE inn_normalized = ?
         FOR UPDATE`,
        [innNormalized],
      );
      // The callback must use this manager for every database read/write that
      // participates in the serialized operation. Otherwise it could run on a
      // different pooled connection and observe state outside this transaction.
      return work(manager);
    });
  }

  public async findSimilar(
    inn: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    return await this.createQueryBuilder("customer")
      .where("customer.inn = :inn", { inn })
      .orWhere("customer.email = :email", { email })
      .orWhere(
        "(customer.first_name LIKE :firstName AND customer.last_name LIKE :lastName)",
        {
          firstName: `%${firstName}%`,
          lastName: `%${lastName}%`,
        },
      )
      .getOne();
  }
}
