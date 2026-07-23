import { Injectable } from "@nestjs/common";
import { CreateDistributorDto } from "./dto/request/create-distributor.dto";
import { UpdateDistributorDto } from "./dto/request/update-distributor.dto";
import { DistributorRepository } from "@orm/repositories";
import { IsNull } from "typeorm";

@Injectable()
export class DistributorService {
  constructor(private readonly distributorRepository: DistributorRepository) {}

  async getCount(): Promise<number> {
    return await this.distributorRepository.count({
      where: { deleted_at: IsNull() },
    });
  }

  async findAll() {
    return await this.distributorRepository.findAll();
  }
}
