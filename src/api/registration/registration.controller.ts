import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorators/Public';
import { RegistrationEmployeeRequestDto } from './dto/request/registration-employee.request.dto';
import { RegistrationCompanyRequestDto } from './dto/request/registration-company.request.dto';
import { RegistrationService } from './registration.service';
import {
  RegistrationSuperAdminWithSecretDto
} from "./dto/request/registration-super-admin.request.dto";

@ApiTags('registration')
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Public()
  @Post('/employee')
  @ApiBody({ type: () => RegistrationEmployeeRequestDto })
  createEmployee(
    @Body() createRegistrationEmployeeDto: RegistrationEmployeeRequestDto,
  ) {
    return this.registrationService.createEmployee(
      createRegistrationEmployeeDto,
    );
  }
  @Public()
  @Post('/partner')
  @ApiBody({ type: () => RegistrationCompanyRequestDto })
  createCompany(@Body() registrationCompanyDto: RegistrationCompanyRequestDto) {
    return this.registrationService.createCompany(registrationCompanyDto);
  }

  @Public()
  @Post('/super-admin')
  createSuperAdmin(@Body() registrationSuperAdminDto: RegistrationSuperAdminWithSecretDto) {
    return this.registrationService.createSuperAdminWithSecret(registrationSuperAdminDto);
  }
}
