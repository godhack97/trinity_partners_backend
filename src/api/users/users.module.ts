import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserEntity } from '../../orm/entities/user.entity';
import { UserToken } from 'src/orm/entities/user-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    UserEntity,
    UserToken,
  ])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}