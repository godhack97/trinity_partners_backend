import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermissionsController } from './admin-permissions.controller';
import { PermissionsService } from './permissions.service';
import { Permission } from '../../../orm/entities/permission.entity';
import { RoleEntity } from '../../../orm/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, RoleEntity])],
  controllers: [AdminPermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService]
})
export class AdminPermissionsModule {}