import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { Injectable } from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { RegistrationEmployeeRequestDto } from "./dto/request/registration-employee.request.dto";
import { RegistrationCompanyRequestDto } from "./dto/request/registration-company.request.dto";
import { UserService } from "src/api/user/user.service";
import { RegistrationSuperAdminWithSecretDto } from "./dto/request/registration-super-admin.request.dto";

@Injectable()
export class RegistrationService {
  constructor(
    private userService: UserService,
    private readonly emailConfirmerService: EmailConfirmerService,
  ) {}
  createEmployee(registrationEmployeeDto: RegistrationEmployeeRequestDto) {
    return this.userService.createEmployee(registrationEmployeeDto);
  }

  async createCompany(registrationCompanyDto: RegistrationCompanyRequestDto) {
    return await this.userService.createCompany(registrationCompanyDto);
  }

  createSuperAdminWithSecret(
    registrationSuperAdminDto: RegistrationSuperAdminWithSecretDto,
  ) {
    return this.userService.createSuperAdminWithSecret(
      registrationSuperAdminDto,
    );
  }

  async resend(user: UserEntity) {
    await this.emailConfirmerService.resend({
      user_id: user.id,
      email: user.email,
      method: EmailConfirmerMethod.EmailConfirmation,
    });
  }
}
