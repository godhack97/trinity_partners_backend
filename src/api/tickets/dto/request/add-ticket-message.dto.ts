import { IsNotEmptyRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional } from "class-validator";

export class AddTicketMessageDto {
  @ApiProperty({ description: "Текст сообщения" })
  @IsNotEmptyRu()
  @IsStringRu()
  message: string;

  @ApiProperty({
    description: "Список вложений (имена файлов)",
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
