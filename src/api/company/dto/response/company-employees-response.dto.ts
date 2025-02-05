import { UserResponseDto } from "@api/user/dto/response/user.response.dto";
import { UserInfoDto } from "@app/dto/user-info.dto";
import { ApiProperty } from "@nestjs/swagger";
import { CompanyEmployeeStatus } from "@orm/entities";
import { Expose, Type } from "class-transformer";

export class EmployeeDto extends UserResponseDto {
  @ApiProperty()
  @Expose()
  @Type(() => UserInfoDto)
  user_info: UserInfoDto;
}

export class CompanyEmployeesResponseDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  company_id: number;
  @ApiProperty()
  @Expose()
  employee_id: number;

  @ApiProperty()
  @Expose()
  status: CompanyEmployeeStatus;
}

export class CompanyEmployeesWithEmpoloyeeResponseDto extends CompanyEmployeesResponseDto {

  @ApiProperty()
  @Expose()
  @Type(() => EmployeeDto)
  employee:EmployeeDto 
}