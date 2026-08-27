import { IsDateRu, IsNotEmptyRu } from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

export class UpdateDealStatusDto {
  @ApiProperty({ enum: DealStatus })
  @IsNotEmptyRu()
  @IsEnum(DealStatus)
  status: DealStatus;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDateRu()
  registration_expires_at?: Date | null;
}
