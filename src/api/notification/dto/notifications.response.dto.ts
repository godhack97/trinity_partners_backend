import { ApiProperty } from "@nestjs/swagger";
import { NotificationCategory, NotificationIconType } from "@orm/entities";
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

  @ApiProperty({ enum: NotificationCategory })
  @Expose()
  category: NotificationCategory;

  @ApiProperty()
  @Expose()
  read_at: Date;

  @ApiProperty({ type: "array", items: { type: "object" }, nullable: true })
  @Expose()
  actions: { label: string; url: string }[] | null;
}
