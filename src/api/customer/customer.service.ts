import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '@orm/repositories';
import { CreateCustomerDto } from './dto/request/create-customer.dto';
import { UpdateCustomerDto } from './dto/request/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}
 

  async findAll() {
    return await this.customerRepository.findAll();
  }

}
