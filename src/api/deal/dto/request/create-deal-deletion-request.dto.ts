import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateDealDeletionRequestDto {
  @ApiProperty({
    description: 'Причина удаления сделки',
    example: 'Дублирование данных'
  })
  @IsNotEmpty({ message: 'Причина удаления обязательна' })
  @IsString({ message: 'Причина удаления должна быть строкой' })
  @MinLength(10, { message: 'Причина удаления должна содержать минимум 10 символов' })
  deletion_reason: string;
}