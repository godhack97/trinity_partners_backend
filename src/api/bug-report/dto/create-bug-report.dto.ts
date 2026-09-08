import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateBugReportDto {
  @ApiProperty({
    description: "Описание ошибки",
    maxLength: 2000,
  })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: "Опишите найденную ошибку" })
  @MaxLength(2000, {
    message: "Описание ошибки не должно превышать 2000 символов",
  })
  message: string;

  @ApiProperty({
    description: "Страница портала, на которой обнаружена ошибка",
    required: false,
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pageUrl?: string;
}
