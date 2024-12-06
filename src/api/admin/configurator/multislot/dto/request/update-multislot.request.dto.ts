import { IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

class MultislotSlots {
  @ApiProperty()
  @IsStringRu()
  slot_id: string;
}

export class UpdateMultislotRequestDto {

  @ApiProperty()
  @IsStringRu()
  name: string;

  @ApiProperty({ type: [MultislotSlots] })
  @ValidateNested()
  @Type(() => MultislotSlots)
  multislot_slots: MultislotSlots[];
}
