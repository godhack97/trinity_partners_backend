import { IsNotEmptyRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNumber, IsOptional } from "class-validator";

export class CreateTicketDto {
  @ApiProperty({
    description: "Тип тикета",
    enum: ["manager", "tech_specialist"],
  })
  @IsNotEmptyRu()
  @IsEnum(["manager", "tech_specialist"], {
    message: "type должен быть manager или tech_specialist",
  })
  type: "manager" | "tech_specialist";

  @ApiProperty({ description: "Тема обращения" })
  @IsNotEmptyRu()
  @IsStringRu()
  subject: string;

  @ApiProperty({ description: "Текст сообщения" })
  @IsNotEmptyRu()
  @IsStringRu()
  message: string;

  @ApiProperty({ description: "ID конфигурации (черновика)", required: false })
  @IsOptional()
  @IsNumber()
  configurationId?: number;

  @ApiProperty({
    description: "Список вложений (имена файлов)",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
