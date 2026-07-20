import { CustomerResponseDto } from "@api/customer/dto/response/customer.response.dto";
import { DistributorResponseDto } from "@api/distributor/dto/response/distributor.response.dto";
import { UserResponseDto } from "@api/user/dto/response/user.response.dto";
import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Bitrix24SyncStatus,
  DealDuplicateReviewStatus,
  DealStatus,
  DealType,
} from "@orm/entities";
import { Expose, Transform, Type } from "class-transformer";

export class DealResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  distributor_id: number;

  @ApiProperty({ required: false })
  @Expose()
  integrator_company_id?: number;

  @ApiProperty({ required: false })
  @Expose()
  integrator_name?: string;

  @ApiProperty({ required: false })
  @Expose()
  integrator_inn?: string;

  @ApiProperty({ required: false })
  @Expose()
  bitrix24_integrator_contact_id?: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  bitrix24_deal_id?: number | null;

  @ApiProperty({ enum: Bitrix24SyncStatus })
  @Expose()
  bitrix24_sync_status: Bitrix24SyncStatus;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @Expose()
  bitrix24_synced_at?: Date | null;

  @ApiProperty()
  @Expose()
  customer_id: number;

  @ApiProperty()
  @Expose()
  creator_id: number;

  @ApiProperty({ enum: DealType })
  @Expose()
  deal_type: DealType;

  @ApiProperty()
  @Expose()
  title?: string;

  @ApiProperty()
  @Expose()
  deal_sum: number;

  @ApiProperty()
  @Expose()
  competition_link: string;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  configuration_link?: string | null;

  @ApiPropertyOptional({ type: "array", items: { type: "object" } })
  @Expose()
  @Transform(({ obj }) => obj.configurations, { toClassOnly: true })
  configurations?: unknown[];

  @ApiPropertyOptional({ type: "array", items: { type: "object" } })
  @Expose()
  @Transform(({ obj }) => obj.attachments, { toClassOnly: true })
  attachments?: unknown[];

  @ApiProperty()
  @Expose()
  purchase_date: Date | string;

  @ApiProperty()
  @Expose()
  comment: string;

  @ApiPropertyOptional({ type: "array", items: { type: "object" } })
  @Expose()
  @Transform(({ obj }) => obj.comments, { toClassOnly: true })
  comments?: unknown[];

  @ApiProperty()
  @Expose()
  deal_num: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Expose()
  special_discount: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  special_price: number | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @Expose()
  discount_date: Date | string | null;

  @ApiProperty()
  @Expose()
  status: DealStatus;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  duplicate_of_deal_id?: number | null;

  @ApiPropertyOptional({ enum: DealDuplicateReviewStatus, nullable: true })
  @Expose()
  duplicate_review_status?: DealDuplicateReviewStatus | null;

  @ApiProperty()
  @Expose()
  @Type(() => UserResponseDto)
  partner: UserResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => CustomerResponseDto)
  customer: CustomerResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => DistributorResponseDto)
  distributor: DistributorResponseDto;

  @ApiProperty({ required: false })
  @Expose()
  @Transform(({ obj }) => obj.integrator_company, { toClassOnly: true })
  integrator_company?: unknown;

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  created_at: Date;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Date)
  updated_at?: Date;

  @ApiProperty({
    description: "Статус заявки на удаление сделки",
    enum: ["yes", "no"],
  })
  @Expose()
  delete_request_status: "yes" | "no";

  @ApiProperty({
    description: "Можно ли текущему пользователю менять этап сделки",
  })
  @Expose()
  can_update_status: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю менять конфигурации сделки",
  })
  @Expose()
  can_update_configurations: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю редактировать поля сделки",
  })
  @Expose()
  can_update_fields: boolean;
}
