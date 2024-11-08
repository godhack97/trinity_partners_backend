import { CompanyEmployeesResponseDto, UserInfoDto } from "@api/company/dto/response/company-employees-response.dto";
import { PartnerResponseDto } from "@api/partner/dto/response/PartnerResponseDto";
import { UserResponseDto } from "@api/user/dto/response/user.response.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class CompanyEmployeesWithCompanyResponseDto extends CompanyEmployeesResponseDto {
  @ApiProperty()
  @Expose()
  @Type(() => PartnerResponseDto)
  company: PartnerResponseDto;
}
export class AuthCheckResponseDto extends UserResponseDto {
  @ApiProperty()
  @Expose()
  @Type(() => CompanyEmployeesWithCompanyResponseDto)
  company_employee: CompanyEmployeesWithCompanyResponseDto;

  @ApiProperty()
  @Expose()
  @Type(() => UserInfoDto)
  user_info: UserInfoDto;
}