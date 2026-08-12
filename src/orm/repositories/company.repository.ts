import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  CompanyEmployeeStatus,
  CompanyEntity,
  CompanyStatus,
  PartnershipType,
} from "../entities";

@Injectable()
export class CompanyRepository extends Repository<CompanyEntity> {
  constructor(
    @InjectRepository(CompanyEntity)
    private repo: Repository<CompanyEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByOwnerId(ownerId: number): Promise<CompanyEntity> {
    return await this.findOne({
      where: { owner_id: ownerId },
      relations: ["employee"],
    });
  }

  async findByIdWithEmployees(id: number): Promise<CompanyEntity> {
    return await this.findOne({
      where: { id },
      relations: ["employee"],
    });
  }

  async findById(id: number): Promise<CompanyEntity> {
    return await this.findOneBy({ id });
  }

  async findUniqueAcceptedByUserId(
    userId: number,
  ): Promise<CompanyEntity | null> {
    const companies = await this.createQueryBuilder("company")
      .leftJoin(
        "company_employees",
        "membership",
        `membership.company_id = company.id
          AND membership.employee_id = :userId
          AND membership.status = :membershipStatus`,
        {
          userId,
          membershipStatus: CompanyEmployeeStatus.Accept,
        },
      )
      .where("company.status = :companyStatus", {
        companyStatus: CompanyStatus.Accept,
      })
      .andWhere(
        "(company.owner_id = :userId OR membership.employee_id = :userId)",
        { userId },
      )
      .distinct(true)
      .limit(2)
      .getMany();

    return companies.length === 1 ? companies[0] : null;
  }

  async findAcceptedByPartnershipType(
    partnershipType: PartnershipType,
  ): Promise<
    Pick<CompanyEntity, "id" | "name" | "inn" | "partnership_type">[]
  > {
    return await this.find({
      where: {
        partnership_type: partnershipType,
        status: CompanyStatus.Accept,
      },
      select: {
        id: true,
        name: true,
        inn: true,
        partnership_type: true,
      },
      order: {
        name: "ASC",
      },
    });
  }

  async findAcceptedDistributorByName(
    name: string,
  ): Promise<CompanyEntity | null> {
    const companies = await this.createQueryBuilder("company")
      .where("LOWER(company.name) = LOWER(:name)", { name })
      .andWhere("company.partnership_type = :partnershipType", {
        partnershipType: PartnershipType.Distributor,
      })
      .andWhere("company.status = :status", { status: CompanyStatus.Accept })
      .limit(2)
      .getMany();

    return companies.length === 1 ? companies[0] : null;
  }

  async findAcceptedIntegratorByInn(
    inn: string,
  ): Promise<CompanyEntity | null> {
    const companies = await this.find({
      where: {
        inn,
        partnership_type: PartnershipType.Integrator,
        status: CompanyStatus.Accept,
      },
      take: 2,
    });

    // ИНН пока не защищён UNIQUE-ограничением. Не выбираем компанию
    // произвольно, если исторические данные содержат несколько кандидатов.
    return companies.length === 1 ? companies[0] : null;
  }
}
