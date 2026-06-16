import { Injectable } from "@nestjs/common";
import { ImportantAlertRepository } from "@orm/repositories";

@Injectable()
export class ImportantAlertService {
  constructor(
    private readonly importantAlertRepository: ImportantAlertRepository,
  ) {}

  async getActive(companyId?: number | null) {
    return await this.importantAlertRepository.findActiveForCompany(companyId);
  }

  async getCount(): Promise<number> {
    return await this.importantAlertRepository.createQueryBuilder().getCount();
  }
}
