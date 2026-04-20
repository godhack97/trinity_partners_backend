import { IsNotEmptyRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateEventDto {
  @ApiProperty({ description: "Название мероприятия" })
  @IsNotEmptyRu()
  @IsStringRu()
  title: string;

  @ApiProperty({ description: "Описание мероприятия", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Дата и время начала (ISO 8601)" })
  @IsNotEmptyRu()
  @IsDateString()
  date: string;

  @ApiProperty({ description: "Дата и время окончания (ISO 8601)", required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ description: "Ссылка на мероприятие (Zoom и т.д.)", required: false })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiProperty({
    description: "Тип мероприятия",
    enum: ["webinar", "conference", "training", "other"],
    default: "webinar",
  })
  @IsOptional()
  @IsEnum(["webinar", "conference", "training", "other"])
  type?: "webinar" | "conference" | "training" | "other";

  @ApiProperty({ description: "URL изображения", required: false })
  @IsOptional()
  @IsString()
  image?: string;
}
