import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus, PartnershipType } from "@orm/entities";

export class CompanyManagerSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class CompanyCapabilitiesDto {
  @ApiProperty()
  can_approve: boolean;

  @ApiProperty()
  can_lock_review: boolean;

  @ApiProperty()
  can_unlock_review: boolean;

  @ApiProperty()
  can_suspend: boolean;

  @ApiProperty()
  can_resume: boolean;

  @ApiProperty()
  can_edit_contacts: boolean;

  @ApiProperty()
  can_assign_manager: boolean;
}

export class CompanyDealStatisticsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  active: number;

  @ApiProperty()
  completed: number;
}

export class CompanyListItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  inn: string;

  @ApiProperty({ enum: PartnershipType })
  partnership_type: PartnershipType;

  @ApiProperty({ enum: CompanyStatus })
  status: CompanyStatus;

  @ApiProperty()
  status_label: string;

  @ApiProperty()
  is_review_locked: boolean;

  @ApiPropertyOptional({ type: CompanyManagerSummaryDto })
  responsible_manager: CompanyManagerSummaryDto | null;

  @ApiProperty()
  employees_count: number;

  @ApiProperty({ type: CompanyDealStatisticsDto })
  deals: CompanyDealStatisticsDto;

  @ApiProperty({ type: CompanyCapabilitiesDto })
  capabilities: CompanyCapabilitiesDto;
}

export class CompanyDetailResponseDto extends CompanyListItemResponseDto {
  @ApiPropertyOptional()
  contact_email: string | null;

  @ApiPropertyOptional()
  contact_phone: string | null;

  @ApiPropertyOptional()
  site_url: string | null;

  @ApiPropertyOptional()
  company_business_line: string | null;

  @ApiPropertyOptional()
  restriction_reason: string | null;

  @ApiPropertyOptional()
  approved_at: Date | null;

  @ApiPropertyOptional({ type: CompanyManagerSummaryDto })
  approved_by: CompanyManagerSummaryDto | null;
}

export class CompanyListMetaResponseDto {
  @ApiProperty()
  current_page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  filtered_total: number;

  @ApiProperty()
  visible_total: number;

  @ApiProperty()
  pages_count: number;
}

export class CompanyListResponseDto {
  @ApiProperty({ type: [CompanyListItemResponseDto] })
  data: CompanyListItemResponseDto[];

  @ApiProperty({ type: CompanyListMetaResponseDto })
  meta: CompanyListMetaResponseDto;
}

export class CompanyAccessStateResponseDto {
  @ApiProperty()
  company_name: string;

  @ApiProperty({ enum: CompanyStatus })
  status: CompanyStatus;

  @ApiProperty()
  status_label: string;

  @ApiProperty()
  is_review_locked: boolean;

  @ApiPropertyOptional()
  reason: string | null;

  @ApiPropertyOptional({ type: CompanyManagerSummaryDto })
  responsible_manager: CompanyManagerSummaryDto | null;

  @ApiProperty({ type: [String] })
  allowed_actions: string[];
}
