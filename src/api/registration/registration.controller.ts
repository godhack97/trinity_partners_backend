import { AuthUser } from "@decorators/auth-user";
import {
  Body,
  Controller,
  HttpCode,
  Post
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { UserEntity } from "@orm/entities";
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
  @HttpCode(200)
  @ApiBody({ type: () => RegistrationCompanyRequestDto })
  createCompany(@Body() registrationCompanyDto: RegistrationCompanyRequestDto) {
    return this.registrationService.createCompany(registrationCompanyDto);
  }

  @Public()
  @Post('/super-admin')
  createSuperAdmin(@Body() registrationSuperAdminDto: RegistrationSuperAdminWithSecretDto) {
    return this.registrationService.createSuperAdminWithSecret(registrationSuperAdminDto);
  }

  @Post('/resend')
  resend(@AuthUser() user: UserEntity) {
    return this.registrationService.resend(user);
  }

}
