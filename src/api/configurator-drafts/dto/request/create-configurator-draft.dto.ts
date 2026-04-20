import { IsNotEmptyRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateConfiguratorDraftDto {
  @ApiProperty({ description: "Название конфигурации" })
  @IsNotEmptyRu()
  @IsStringRu()
  title: string;

  @ApiProperty({ description: "ID сервера (UUID)", required: false })
  @IsOptional()
  @IsString()
  server_id?: string;

  @ApiProperty({ description: "ID высоты шасси (UUID)", required: false })
  @IsOptional()
  @IsString()
  serverbox_height_id?: string;

  @ApiProperty({ description: "Массив выбранных компонентов", required: false })
  @IsOptional()
  @IsArray()
  components?: any[];

  @ApiProperty({ description: "Итоговая цена", required: false })
  @IsOptional()
  @IsNumber()
  total_price?: number;

  @ApiProperty({ description: "Описание/комментарий", required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
