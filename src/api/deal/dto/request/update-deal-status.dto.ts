import { IsNotEmptyRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { IsEnum } from "class-validator";

export class UpdateDealStatusDto {
  @ApiProperty({ enum: DealStatus })
  @IsNotEmptyRu()
  @IsEnum(DealStatus)
  status: DealStatus;
}
