import { ApiProperty } from "@nestjs/swagger";
import { IsEmailRu, IsNotEmptyRu } from "../../../../decorators/validate";
import { RoleTypes } from "@app/types/RoleTypes";
import { IsBoolean, IsIn, IsOptional } from "class-validator";

export class RegistrationEmployeeRequestDto {
  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  job_title: string;

  @ApiProperty({
    required: false,
    enum: [RoleTypes.SalesManager, RoleTypes.Staff],
  })
  @IsOptional()
  @IsIn([RoleTypes.SalesManager, RoleTypes.Staff])
  business_role?: RoleTypes.SalesManager | RoleTypes.Staff;

  @ApiProperty()
  password: string;

  @ApiProperty()
  @IsNotEmptyRu()
  phone: string;

  @ApiProperty()
  @IsNotEmptyRu()
  company_inn: string;

  @ApiProperty()
  @IsBoolean()
  agreement_accepted: boolean;

  @ApiProperty()
  @IsBoolean()
  privacy_policy_accepted: boolean;
}
