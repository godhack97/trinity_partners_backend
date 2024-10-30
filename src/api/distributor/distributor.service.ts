import { Injectable } from '@nestjs/common';
import { CreateDistributorDto } from './dto/request/create-distributor.dto';
import { UpdateDistributorDto } from './dto/request/update-distributor.dto';
import { DistributorRepository } from '@orm/repositories';

@Injectable()
export class DistributorService {
  
  constructor(private readonly distributorRepository: DistributorRepository) {}
  
  async findAll() {
    return await this.distributorRepository.findAll();
  }

}
