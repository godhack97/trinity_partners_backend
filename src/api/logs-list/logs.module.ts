import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAction } from 'src/logs/user-action.entity';
import { UserActionsService } from './user-actions.service';
import { UserActionsController } from './user-actions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserAction])],
  controllers: [UserActionsController],
  providers: [UserActionsService],
  exports: [UserActionsService],
})

export class LogsListModule {}
