import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { TicketMessageResponseDto } from "./ticket-message-response.dto";

export class TicketResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  creator_id: number;

  @ApiProperty()
  @Expose()
  assignee_id?: number;

  @ApiProperty({ enum: ["manager", "tech_specialist"] })
  @Expose()
  type: "manager" | "tech_specialist";

  @ApiProperty()
  @Expose()
  subject: string;

  @ApiProperty({ enum: ["open", "in_progress", "closed"] })
  @Expose()
  status: "open" | "in_progress" | "closed";

  @ApiProperty()
  @Expose()
  configuration_id?: number;

  @ApiProperty({ type: () => [TicketMessageResponseDto] })
  @Expose()
  @Type(() => TicketMessageResponseDto)
  messages: TicketMessageResponseDto[];

  @ApiProperty()
  @Expose()
  unread_count: number;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty()
  @Expose()
  updated_at: Date;
}
