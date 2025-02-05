import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class UserInfoDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  user_id: number;

  @ApiProperty()
  @Expose()
  first_name: string;

  @ApiProperty()
  @Expose()
  last_name: string;

  @ApiProperty()
  @Expose()
  company_name: string;

  @ApiProperty()
  @Expose()
  job_title: string;

  @ApiProperty()
  @Expose()
  phone: string;

  @ApiProperty()
  @Expose()
  photo_url: string;
}