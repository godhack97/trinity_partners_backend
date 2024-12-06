import { IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

class MultislotSlotsDto {
  @ApiProperty()
  @IsStringRu()
  slot_id: string;
}

export class UpdateMultislotRequestDto {

  @ApiProperty()
  @IsStringRu()
  name: string;

  @ApiProperty({ type: [MultislotSlotsDto] })
  @ValidateNested()
  @Type(() => MultislotSlotsDto)
  multislot_slots: MultislotSlotsDto[];
}
