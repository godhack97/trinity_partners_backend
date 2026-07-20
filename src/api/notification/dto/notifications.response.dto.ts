import { ApiProperty } from "@nestjs/swagger";
import {
  NotificationCategory,
  NotificationIconType,
  NotificationType,
} from "@orm/entities";
import { Expose, Type } from "class-transformer";

export class NotificationActionResponseDto {
  @ApiProperty()
  @Expose()
  label: string;

  @ApiProperty()
  @Expose()
  url: string;
}

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

  @ApiProperty({ enum: NotificationType })
  @Expose()
  type: NotificationType;

  @ApiProperty()
  @Expose()
  is_read: boolean;

  @ApiProperty({ enum: NotificationIconType })
  @Expose()
  icon: NotificationIconType;

  @ApiProperty({ enum: NotificationCategory })
  @Expose()
  category: NotificationCategory;

  @ApiProperty({ nullable: true, format: "date-time" })
  @Expose()
  read_at: Date | null;

  @ApiProperty({ type: [NotificationActionResponseDto], nullable: true })
  @Expose()
  @Type(() => NotificationActionResponseDto)
  actions: { label: string; url: string }[] | null;

  @ApiProperty({ nullable: true })
  @Expose()
  ticket_id: number | null;

  @ApiProperty({ format: "date-time" })
  @Expose()
  created_at: Date;

  @ApiProperty({ format: "date-time" })
  @Expose()
  updated_at: Date;

  @ApiProperty({
    type: () => [NotificationsResponseDto],
    required: false,
    description: "Предыдущие уведомления, сгруппированные по ticket_id",
  })
  @Expose()
  @Type(() => NotificationsResponseDto)
  related?: NotificationsResponseDto[];
}
