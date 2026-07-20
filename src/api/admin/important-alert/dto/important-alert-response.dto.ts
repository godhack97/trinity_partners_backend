import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class ImportantAlertResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty()
  @Expose()
  message: string;

  @ApiProperty()
  @Expose()
  severity: string;

  @ApiProperty()
  @Expose()
  is_active: boolean;

  @ApiProperty()
  @Expose()
  author_id: number;

  @ApiProperty({ nullable: true })
  @Expose()
  target_company_id: number | null;

  @ApiProperty()
  @Expose()
  created_at: string;

  @ApiProperty()
  @Expose()
  updated_at: string;
}

export class ImportantAlertTargetCompanyDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  inn: string;

  @ApiProperty()
  status: string;
}
