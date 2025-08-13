import { ApiProperty } from "@nestjs/swagger";
import { DealDeletionStatus } from "@orm/entities/deal-deletion-request.entity";

export class DealDeletionRequestResponseDto {
  @ApiProperty({ description: "ID заявки" })
  id: number;

  @ApiProperty({ description: "ID сделки" })
  deal_id: number;

  @ApiProperty({ description: "Номер сделки" })
  deal_num: string;

  @ApiProperty({ description: "ID пользователя, подавшего заявку" })
  requester_id: number;

  @ApiProperty({ description: "Email пользователя, подавшего заявку" })
  requester_email: string;

  @ApiProperty({ description: "Причина удаления" })
  deletion_reason: string;

  @ApiProperty({ description: "Статус заявки", enum: DealDeletionStatus })
  status: DealDeletionStatus;

  @ApiProperty({
    description: "ID администратора, обработавшего заявку",
    nullable: true,
  })
  processed_by_id?: number;

  @ApiProperty({
    description: "Email администратора, обработавшего заявку",
    nullable: true,
  })
  processed_by_email?: string;

  @ApiProperty({ description: "Дата обработки заявки", nullable: true })
  processed_at?: Date | null;

  @ApiProperty({ description: "Дата создания заявки" })
  created_at: Date | string | any;

  @ApiProperty({ description: "Дата обновления заявки" })
  updated_at: Date | string | any;
}
