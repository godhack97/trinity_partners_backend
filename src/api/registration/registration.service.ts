import { Injectable } from "@nestjs/common";
import { RegistrationEmployeeRequestDto } from './dto/request/registration-employee.request.dto';
import { RegistrationCompanyRequestDto } from './dto/request/registration-company.request.dto';
import { UserService } from 'src/api/user/user.service';
import { RegistrationSuperAdminWithSecretDto } from "./dto/request/registration-super-admin.request.dto";

@Injectable()
export class RegistrationService {
  constructor(private userService: UserService) {}
  createEmployee(registrationEmployeeDto: RegistrationEmployeeRequestDto) {
    return this.userService.createEmployee(registrationEmployeeDto);
  }

  async createCompany(registrationCompanyDto: RegistrationCompanyRequestDto) {
    return await this.userService.createCompany(registrationCompanyDto);
  }

  createSuperAdminWithSecret(registrationSuperAdminDto: RegistrationSuperAdminWithSecretDto) {
    return this.userService.createSuperAdminWithSecret(registrationSuperAdminDto);
  }
}
