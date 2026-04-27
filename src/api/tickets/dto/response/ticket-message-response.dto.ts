import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class TicketMessageResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  ticket_id: number;

  @ApiProperty()
  @Expose()
  sender_id: number;

  @ApiProperty({ nullable: true })
  @Expose()
  sender_name: string | null;

  @ApiProperty()
  @Expose()
  message: string;

  @ApiProperty()
  @Expose()
  attachments?: string[];

  @ApiProperty()
  @Expose()
  is_read: boolean;

  @ApiProperty()
  @Expose()
  created_at: Date;
}
