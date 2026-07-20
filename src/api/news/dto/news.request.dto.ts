import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class NewsRequestDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: "JSON-документ EditorJS с непустым blocks" })
  @IsString()
  @IsNotEmpty()
  @IsJSON()
  content: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @Transform(({ value }) => value === "" ? null : value)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  photo?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @Transform(({ value }) => value === "" ? null : value)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  image_big?: string | null;
}
