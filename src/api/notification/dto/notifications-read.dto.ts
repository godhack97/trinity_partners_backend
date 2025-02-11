import {
  IsNotEmptyRu,
  IsNumberRu
} from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";

export class NotificationsReadDto {

  @ApiProperty()
  @IsNumberRu({},{each: true})
  @IsNotEmptyRu()
  ids: number[];

}
