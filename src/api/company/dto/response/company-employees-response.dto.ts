import { RoleResponseDto } from "@api/role/dto/response/role.response.dto";
import { UserResponseDto } from "@api/user/dto/response/user.response.dto";
import { ApiProperty } from "@nestjs/swagger";
import { CompanyEmployeeStatus } from "@orm/entities";
import { Expose, Type } from "class-transformer";

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