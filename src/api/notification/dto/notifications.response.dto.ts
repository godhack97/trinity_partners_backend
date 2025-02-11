import { ApiProperty } from "@nestjs/swagger";
import { NotificationIconType, } from "@orm/entities";
import { Expose } from "class-transformer";

export class NotificationsResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  user_id: number;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty()
  @Expose()
  text: string;

  @ApiProperty()
  @Expose()
  type: string;

  @ApiProperty()
  @Expose()
  is_read: boolean;

  @ApiProperty()
  @Expose()
  icon: NotificationIconType;

  @ApiProperty()
  @Expose()
  read_at: Date;

}
