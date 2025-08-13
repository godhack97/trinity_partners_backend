import { SearchDealDto } from "@api/deal/dto/request/search-deal.dto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DealEntity } from "@orm/entities";
import { DealDeletionStatus } from "@orm/entities/deal-deletion-request.entity";
import {
  Between,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Repository,
} from "typeorm";

@Injectable()
export class DealRepository extends Repository<DealEntity> {
  constructor(
    @InjectRepository(DealEntity)
    private repo: Repository<DealEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async countDealsForToday(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await this.count({
      where: {
        created_at: Between(startOfDay, endOfDay),
      },
    });
  }

  public async findById(id: number) {
    return await this.findOneBy({ id });
  }

  public async findDealsWithFilters(
    entry?: SearchDealDto,
  ): Promise<DealEntity[]> {
    const queryBuilder = this.createQueryBuilder("deal")
      .leftJoinAndSelect("deal.distributor", "distributor")
      .leftJoinAndSelect("deal.customer", "customer")
      .leftJoinAndSelect("deal.partner", "partner")
      .leftJoinAndSelect("partner.role", "role")
      .leftJoin(
        "deal_deletion_requests",
        "deletion_request",
        "deletion_request.deal_id = deal.id AND deletion_request.status = :pendingStatus",
        { pendingStatus: DealDeletionStatus.PENDING },
      )
      .addSelect(
        "CASE WHEN deletion_request.id IS NOT NULL THEN 'yes' ELSE 'no' END",
        "delete_request_status",
      );

    if (entry?.startDate && entry?.endDate) {
      queryBuilder.andWhere(
        "deal.purchase_date BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(entry.startDate),
          endDate: new Date(entry.endDate),
        },
      );
    } else if (entry?.startDate) {
      queryBuilder.andWhere("deal.purchase_date >= :startDate", {
        startDate: new Date(entry.startDate),
      });
    } else if (entry?.endDate) {
      queryBuilder.andWhere("deal.purchase_date <= :endDate", {
        endDate: new Date(entry.endDate),
      });
    }

    if (entry?.status) {
      queryBuilder.andWhere("deal.status = :status", { status: entry.status });
    }

    if (entry?.search) {
      const search = `%${entry.search.toLowerCase()}%`;
      queryBuilder.andWhere(
        "(LOWER(deal.deal_num) LIKE :search OR LOWER(deal.deal_sum) LIKE :search OR LOWER(deal.title) LIKE :search)",
        { search },
      );
    }

    const result = await queryBuilder.getRawAndEntities();

    const deals = [];

    for (let i = 0; i < result.entities.length; i++) {
      const deal = result.entities[i];
      const raw = result.raw[i];

      const partner = deal.partner;
      if (partner && partner.lazy_owner_company) {
        const partnerCompany = await partner.lazy_owner_company;
        deal.partner.owner_company = partnerCompany;
      }

      const dealWithStatus = {
        ...deal,
        delete_request_status: raw.delete_request_status,
      };

      deals.push(dealWithStatus);
    }

    return deals;
  }
}
