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

  @ApiProperty({ required: false })
  @Expose()
  target_company_id?: number;

  @ApiProperty()
  @Expose()
  created_at: string;

  @ApiProperty()
  @Expose()
  updated_at: string;
}
