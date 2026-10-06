import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class ImpersonationExchangeRequestDto {
  @ApiProperty({ description: "Одноразовый код входа", minLength: 64, maxLength: 64 })
  @IsString()
  @Length(64, 64)
  code: string;
}
