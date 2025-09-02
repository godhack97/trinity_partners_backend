import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateRoleRequestDto {
  @ApiProperty({ 
    description: 'Название роли', 
    example: 'manager',
    required: false 
  })
  @IsOptional()
  @IsString({ message: 'Название должно быть строкой' })
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Название не должно превышать 50 символов' })
  name?: string;

  @ApiProperty({ 
    description: 'Описание роли', 
    example: 'Менеджер по продажам',
    required: false 
  })
  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(500, { message: 'Описание не должно превышать 500 символов' })
  description?: string;
}