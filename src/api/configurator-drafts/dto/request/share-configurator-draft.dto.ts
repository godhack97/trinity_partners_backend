import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class ShareConfiguratorDraftDto {
  @ApiProperty()
  @IsInt()
  employee_id: number;
}
