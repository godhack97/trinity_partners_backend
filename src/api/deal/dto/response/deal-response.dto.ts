import { CustomerResponseDto } from "@api/customer/dto/response/customer.response.dto";
import { DistributorResponseDto } from "@api/distributor/dto/response/distributor.response.dto";
import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Bitrix24SyncStatus,
  DealDuplicateReviewStatus,
  DealStatus,
  DealType,
  PartnershipType,
} from "@orm/entities";
import { Expose, Transform, Type } from "class-transformer";

export class DealParticipantCompanyDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  inn: string;

  @ApiProperty({ enum: PartnershipType })
  @Expose()
  partnership_type: PartnershipType;
}

class DealCreatorInfoDto {
  @ApiPropertyOptional()
  @Expose()
  first_name?: string;

  @ApiPropertyOptional()
  @Expose()
  last_name?: string;

  @ApiPropertyOptional()
  @Expose()
  job_title?: string;

  @ApiPropertyOptional()
  @Expose()
  phone?: string;
}

class DealCreatorResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  email: string;

  @ApiPropertyOptional({ type: () => DealCreatorInfoDto })
  @Expose()
  @Type(() => DealCreatorInfoDto)
  user_info?: DealCreatorInfoDto;

  @ApiPropertyOptional({ type: () => DealParticipantCompanyDto })
  @Expose()
  @Type(() => DealParticipantCompanyDto)
  owner_company?: DealParticipantCompanyDto;
}

class DealResponsibleManagerInfoDto {
  @ApiPropertyOptional()
  @Expose()
  first_name?: string;

  @ApiPropertyOptional()
  @Expose()
  last_name?: string;
}

class DealResponsibleManagerResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  email: string;

  @ApiPropertyOptional({ type: () => DealResponsibleManagerInfoDto })
  @Expose()
  @Type(() => DealResponsibleManagerInfoDto)
  user_info?: DealResponsibleManagerInfoDto;
}

export class DealResponseDto extends WithIdDto {
  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  distributor_id?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  distributor_company_id?: number | null;

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

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  responsible_manager_id?: number | null;

  @ApiPropertyOptional({
    type: () => DealResponsibleManagerResponseDto,
    nullable: true,
  })
  @Expose()
  @Type(() => DealResponsibleManagerResponseDto)
  responsible_manager?: DealResponsibleManagerResponseDto | null;

  @ApiProperty({ enum: DealType })
  @Expose()
  deal_type: DealType;

  @ApiProperty()
  @Expose()
  title?: string;

  @ApiProperty()
  @Expose()
  deal_sum: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  final_deal_sum?: number | null;

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

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @Expose()
  registration_expires_at?: Date | string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  duplicate_of_deal_id?: number | null;

  @ApiPropertyOptional({ enum: DealDuplicateReviewStatus, nullable: true })
  @Expose()
  duplicate_review_status?: DealDuplicateReviewStatus | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  duplicate_reviewed_by_user_id?: number | null;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  @Expose()
  duplicate_reviewed_at?: Date | string | null;

  @ApiPropertyOptional({ type: String, maxLength: 1000, nullable: true })
  @Expose()
  duplicate_review_comment?: string | null;

  @ApiProperty()
  @Expose()
  @Type(() => DealCreatorResponseDto)
  partner: DealCreatorResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => CustomerResponseDto)
  customer: CustomerResponseDto;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  @Type(() => DistributorResponseDto)
  distributor?: DistributorResponseDto | null;

  @ApiPropertyOptional({
    type: () => DealParticipantCompanyDto,
    nullable: true,
  })
  @Expose()
  @Type(() => DealParticipantCompanyDto)
  distributor_company?: DealParticipantCompanyDto | null;

  @ApiPropertyOptional({
    type: () => DealParticipantCompanyDto,
    nullable: true,
  })
  @Expose()
  @Type(() => DealParticipantCompanyDto)
  integrator_company?: DealParticipantCompanyDto | null;

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

  @ApiProperty({
    description: "Можно ли текущему пользователю отправить черновик сделки",
  })
  @Expose()
  can_submit: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю назначать стороны сделки",
  })
  @Expose()
  can_assign_participants: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю запросить удаление сделки",
  })
  @Expose()
  can_request_deletion: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю добавлять комментарии",
  })
  @Expose()
  can_comment: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю просматривать конфигурацию",
  })
  @Expose()
  can_view_configuration: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю принимать решение по сделке",
  })
  @Expose()
  can_decide: boolean;

  @ApiProperty({
    description: "Можно ли текущему пользователю видеть итоговую сумму сделки",
  })
  @Expose()
  can_view_final_deal_sum: boolean;
}
