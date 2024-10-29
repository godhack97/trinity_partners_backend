import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DealEntity } from "@orm/entities";
import { Between, Repository } from "typeorm";

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
  
}