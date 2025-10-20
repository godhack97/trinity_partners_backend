import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePartnerDto {
  @ApiProperty({ description: 'ID менеджера', required: true })
  @IsInt()
  manager_id: number;
}