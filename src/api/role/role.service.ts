import { Injectable } from '@nestjs/common';
import { CreateRoleRequestDto } from './dto/request/create-role.request.dto';

@Injectable()
export class RoleService {
  create(createRoleDto: CreateRoleRequestDto) {
    return 'This action adds a new role';
  }

  findAll() {
    return `This action returns all role`;
  }

  findOne(id: number) {
    return `This action returns a #${id} role`;
  }
}
