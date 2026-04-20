import { Injectable } from "@nestjs/common";
import { ImportantAlertRepository } from "@orm/repositories";

@Injectable()
export class ImportantAlertService {
  constructor(
    private readonly importantAlertRepository: ImportantAlertRepository,
  ) {}

  async getActive() {
    return await this.importantAlertRepository.findActive();
  }

  async getCount(): Promise<number> {
    return await this.importantAlertRepository.createQueryBuilder().getCount();
  }
}
