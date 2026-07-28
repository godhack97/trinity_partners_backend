import { IsString, IsOptional, MinLength, MaxLength, IsNotEmpty, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRoleRequestDto {
  @ApiProperty({ 
    description: 'Название роли', 
    example: 'manager' 
  })
  @IsNotEmpty({ message: 'Название роли обязательно' })
  @IsString({ message: 'Название должно быть строкой' })
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Название не должно превышать 50 символов' })
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Код должен начинаться с буквы и содержать только латинские буквы, цифры и _',
  })
  name: string;

  @ApiProperty({
    description: 'Понятное название роли',
    example: 'Менеджер по продажам',
  })
  @IsNotEmpty({ message: 'Название роли обязательно' })
  @IsString({ message: 'Название роли должно быть строкой' })
  @MinLength(2, { message: 'Название роли должно содержать минимум 2 символа' })
  @MaxLength(100, { message: 'Название роли не должно превышать 100 символов' })
  display_name: string;

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
