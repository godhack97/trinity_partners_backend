import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class MultislotSlotRequestDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  slot_id: string;
}

export class CreateMultislotRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ type: [MultislotSlotRequestDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((slot: MultislotSlotRequestDto) => slot.slot_id)
  @ValidateNested({ each: true })
  @Type(() => MultislotSlotRequestDto)
  multislot_slots: MultislotSlotRequestDto[];
}
