import { SearchDealDto } from "@api/deal/dto/request/search-deal.dto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DealEntity } from "@orm/entities";
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";

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

  public async findDealsByDateRange(entry: SearchDealDto): Promise<DealEntity[]> {
    let whereCondition = {};
    
    if (entry.startDate && entry.endDate) {
      whereCondition = { purchase_date: Between(new Date(entry.startDate), new Date(entry.endDate)) };
    } else if (entry.startDate) {
      whereCondition = { purchase_date: MoreThanOrEqual(new Date(entry.startDate)) };
    } else if (entry.endDate) {
      whereCondition = { purchase_date: LessThanOrEqual(new Date(entry.endDate)) };
    }
    
    return await this.find({
      where: whereCondition,
    });
  }
}