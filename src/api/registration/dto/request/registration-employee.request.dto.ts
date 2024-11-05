import { ApiProperty } from '@nestjs/swagger';
import { IsEmailRu, IsNotEmptyRu } from "../../../../decorators/validate";

export class RegistrationEmployeeRequestDto {
  @ApiProperty()
  @IsNotEmptyRu()
  company_id: number;

  @ApiProperty()
  company_name: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  job_title: string; //должность

  @ApiProperty()
  password: string;

  @ApiProperty()
  phone: string;
}

