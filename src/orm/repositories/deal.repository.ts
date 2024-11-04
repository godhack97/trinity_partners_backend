import { SearchDealDto } from "@api/deal/dto/request/search-deal.dto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DealEntity } from "@orm/entities";
import { Between, LessThanOrEqual, Like, MoreThanOrEqual, Repository } from "typeorm";

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

  public async findDealsWithFilters(entry?: SearchDealDto): Promise<DealEntity[]> {
    // let whereCondition = {};
    
    // if (entry?.startDate && entry?.endDate) {
    //   whereCondition = { purchase_date: Between(new Date(entry.startDate), new Date(entry.endDate)) };   
    // } else if (entry?.startDate) {
    //   whereCondition = { purchase_date: MoreThanOrEqual(new Date(entry.startDate)) };
    // } else if (entry?.endDate) {
    //   whereCondition = { purchase_date: LessThanOrEqual(new Date(entry.endDate)) };
    // }

    // if (entry?.status) {
    //   whereCondition = { ...whereCondition, status: entry.status };
    // }

    // if(entry?.search) {
    //   whereCondition = [
    //     { ...whereCondition, deal_num: Like(`%${entry.search.toLowerCase()}%`) },
    //     { ...whereCondition, deal_sum: Like(`%${entry.search.toLowerCase()}%`) },
    //     { ...whereCondition, title: Like(`%${entry.search.toLowerCase()}%`) }
    //   ];
    // }
    
    // return await this.find({
    //   where: whereCondition,
    // });

    // Чтобы искало без учета регистра, плюс в дальнейшем проще будет добавялть условия поиска
    const queryBuilder = this.createQueryBuilder("deal")
     .leftJoinAndSelect("deal.distributor", "distributor")
     .leftJoinAndSelect("deal.customer", "customer")
     .leftJoinAndSelect("deal.partner", "partner")
     .leftJoinAndSelect("partner.role", "role");

    if (entry?.startDate && entry?.endDate) {
      queryBuilder.andWhere("deal.purchase_date BETWEEN :startDate AND :endDate", {
        startDate: new Date(entry.startDate),
        endDate: new Date(entry.endDate),
      });
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
        { search }
      );
    }
    return await queryBuilder.getMany();
  }
}