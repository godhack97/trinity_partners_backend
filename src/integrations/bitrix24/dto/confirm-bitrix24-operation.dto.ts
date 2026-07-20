import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsBoolean } from "class-validator";

export class ConfirmBitrix24OperationDto {
  @ApiProperty({
    type: Boolean,
    example: true,
    description: "Явное подтверждение запуска массовой операции Bitrix24",
  })
  @IsBoolean()
  @Equals(true, { message: "confirm должен быть true" })
  confirm: boolean;
}
