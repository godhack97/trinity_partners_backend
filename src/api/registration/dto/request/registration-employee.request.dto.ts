import { ApiProperty } from "@nestjs/swagger";
import { IsEmailRu, IsNotEmptyRu } from "../../../../decorators/validate";
import { RoleTypes } from "@app/types/RoleTypes";
import { IsIn, IsOptional } from "class-validator";

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
    enum: [RoleTypes.SalesManager, RoleTypes.TechnicalSpecialist, RoleTypes.Staff],
  })
  @IsOptional()
  @IsIn([RoleTypes.SalesManager, RoleTypes.TechnicalSpecialist, RoleTypes.Staff])
  business_role?: RoleTypes.SalesManager | RoleTypes.TechnicalSpecialist | RoleTypes.Staff;

  @ApiProperty()
  password: string;

  @ApiProperty()
  @IsNotEmptyRu()
  phone: string;

  @ApiProperty()
  @IsNotEmptyRu()
  company_inn: string;
}
