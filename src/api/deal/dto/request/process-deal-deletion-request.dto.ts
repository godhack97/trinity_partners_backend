import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { DealDeletionStatus } from '@orm/entities/deal-deletion-request.entity';

export class ProcessDealDeletionRequestDto {
  @ApiProperty({
    description: 'Статус обработки заявки',
    enum: [DealDeletionStatus.APPROVED, DealDeletionStatus.REJECTED],
    example: DealDeletionStatus.APPROVED
  })
  @IsNotEmpty({ message: 'Статус обработки обязателен' })
  @IsEnum([DealDeletionStatus.APPROVED, DealDeletionStatus.REJECTED], {
    message: 'Статус должен быть approved или rejected'
  })
  status: DealDeletionStatus.APPROVED | DealDeletionStatus.REJECTED;
}