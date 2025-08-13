import { ApiProperty } from "@nestjs/swagger";

export class CreateMultislotRequestDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  slotIds: any[];
}
