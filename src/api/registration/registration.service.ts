import { Body, Injectable } from "@nestjs/common";
import { RegistrationEmployeeRequestDto } from './dto/request/registration-employee.request.dto';
import { RegistrationCompanyRequestDto } from './dto/request/registration-company.request.dto';
import { UserService } from 'src/api/user/user.service';
import { RegistrationSuperAdminDto } from "./dto/request/registration-super-admin.request.dto";

@Injectable()
export class RegistrationService {
  constructor(private userService: UserService) {}
  createEmployee(registrationEmployeeDto: RegistrationEmployeeRequestDto) {
    return this.userService.createEmployee(registrationEmployeeDto);
  }
  createCompany(registrationCompanyDto: RegistrationCompanyRequestDto) {
    return this.userService.createCompany(registrationCompanyDto);
  }

  createSuperAdmin(registrationSuperAdminDto: RegistrationSuperAdminDto) {
    return this.userService.createSuperAdmin(registrationSuperAdminDto);
  }
}
