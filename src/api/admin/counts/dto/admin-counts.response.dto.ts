import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AdminRoleCountsResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  super_admin: number;

  @ApiProperty({ type: Number, example: 2 })
  employee_admin: number;

  @ApiProperty({ type: Number, example: 3 })
  content_manager: number;

  @ApiProperty({ type: Number, example: 4 })
  partner_manager: number;

  @ApiProperty({ type: Number, example: 2 })
  technical_specialist: number;
}

export class AdminAccountCountsResponseDto {
  @ApiProperty({ type: Number })
  all: number;

  @ApiProperty({ type: Number })
  archived: number;

  @ApiProperty({ type: AdminRoleCountsResponseDto })
  byRole: AdminRoleCountsResponseDto;
}

export class AdminPartnerCountsResponseDto {
  @ApiPropertyOptional({
    type: Number,
    description: "Сотрудники компаний; доступно только super_admin",
  })
  users?: number;

  @ApiProperty({ type: Number })
  requests: number;

  @ApiProperty({ type: Number })
  accepted: number;

  @ApiProperty({ type: Number })
  rejected: number;

  @ApiProperty({ type: Number })
  suspended: number;
}

export class AdminConfiguratorCountsResponseDto {
  @ApiProperty({ type: Number })
  serverboxes: number;

  @ApiProperty({ type: Number })
  slots: number;

  @ApiProperty({ type: Number })
  serverGenerations: number;

  @ApiProperty({ type: Number })
  servers: number;

  @ApiProperty({ type: Number })
  processorGenerations: number;

  @ApiProperty({ type: Number })
  components: number;

  @ApiProperty({ type: Number })
  componentstypes: number;
}

export class AdminDealCountsResponseDto {
  @ApiProperty({ type: Number })
  distributors: number;

  @ApiProperty({ type: Number })
  all: number;

  @ApiProperty({ type: Number })
  moderation: number;

  @ApiProperty({ type: Number })
  registered: number;

  @ApiProperty({ type: Number })
  canceled: number;

  @ApiProperty({ type: Number })
  win: number;

  @ApiProperty({ type: Number })
  loose: number;

  @ApiProperty({ type: Number })
  requestDeleted: number;
}

export class AdminToolCountsResponseDto {
  @ApiProperty({ type: Number })
  logs: number;
}

export class AdminCountsResponseDto {
  @ApiPropertyOptional({ type: Number })
  news?: number;

  @ApiPropertyOptional({ type: AdminAccountCountsResponseDto })
  admins?: AdminAccountCountsResponseDto;

  @ApiPropertyOptional({ type: AdminPartnerCountsResponseDto })
  partners?: AdminPartnerCountsResponseDto;

  @ApiPropertyOptional({ type: AdminConfiguratorCountsResponseDto })
  configurator?: AdminConfiguratorCountsResponseDto;

  @ApiPropertyOptional({ type: AdminDealCountsResponseDto })
  deals?: AdminDealCountsResponseDto;

  @ApiPropertyOptional({ type: AdminToolCountsResponseDto })
  tools?: AdminToolCountsResponseDto;

  @ApiPropertyOptional({ type: Number })
  importantAlerts?: number;
}
