import { IsRussianPhoneRu, MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsOptional, ValidateIf } from "class-validator";

export class ProfileEmployeeRequestDto {
  @ApiProperty()
  @Expose()
  @MinLengthRu(6)
  photo_url?: string;

  @ApiProperty()
  @Expose()
  job_title?: string;

  @ApiProperty()
  @Expose()
  @IsOptional()
  @ValidateIf((_object, value) => value !== "")
  @IsRussianPhoneRu()
  phone?: string;
}
