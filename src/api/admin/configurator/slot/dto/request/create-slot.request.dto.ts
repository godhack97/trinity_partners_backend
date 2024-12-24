import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { IsNotEmptyRu } from "@decorators/validate";

export class CreateSlotRequestDto {
  @ApiProperty()
  @IsNotEmptyRu()
  name: string;

  @ApiProperty()
  @IsOptional()
  type_id?: string | null;
}