import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { DealConfigurationDto } from "./deal-configuration.dto";

export class AddDealConfigurationsDto {
  @ApiProperty({ type: () => [DealConfigurationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealConfigurationDto)
  configurations: DealConfigurationDto[];
}
