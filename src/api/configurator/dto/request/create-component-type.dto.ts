import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateComponentTypeDto {
  @ApiProperty({ description: "Название типа компонента", maxLength: 36 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(36)
  name: string;
}