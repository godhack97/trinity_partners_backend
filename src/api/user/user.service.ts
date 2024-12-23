import { UpdatePasswordRequestDto } from "@api/user/dto/request/update-password.request.dto";
import { UpdateUserRequestDto } from "@api/user/dto/request/update-user.request.dto";
import { UserSettingRepository } from "@orm/repositories/user-setting.repository";

import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { CompanyRepository } from 'src/orm/repositories/company.repository';
import { RoleRepository } from 'src/orm/repositories/role.repository';
import { UserInfoRepository } from 'src/orm/repositories/user-info.repository';
import { UserRepository } from 'src/orm/repositories/user.repository';
import {
  createCredentials,
  createPassword,
  verifyPassword
} from 'src/utils/password';
import { DataSource } from 'typeorm';
import { RegistrationEmployeeRequestDto } from '../registration/dto/request/registration-employee.request.dto';
import { RegistrationCompanyRequestDto } from '../registration/dto/request/registration-company.request.dto';
import { CompanyEmployeeRepository } from "@orm/repositories";
import { CompanyEmployeeStatus, CompanyStatus } from "@orm/entities";
import { RegistrationSuperAdminDto } from "../registration/dto/request/registration-super-admin.request.dto";

const USER_SECRET = 'Неправильно введен secret';
const USER_EXISTS = 'Пользователь с таким email уже существует';
const USER_NOT_EXISTS = 'Пользователь не найден';
const EMAIl_EXISTS = email => `Такой email: ${email} уже существует`;
//Можно перенести в .env
const SECRET_KEY = 'askhl32423ksajdhgfa!!dsfljnfla232fsafsdnn!21412'
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userInfoRepository: UserInfoRepository,
    private readonly roleRepository: RoleRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private dataSource: DataSource,
  ) {}

  async createEmployee(
    registrationEmployeeDto: RegistrationEmployeeRequestDto,
  ) {
    const user = await this.userRepository.findByEmail(
      registrationEmployeeDto.email,
    );

    if (user) throw new HttpException(USER_EXISTS, HttpStatus.FORBIDDEN);

    const roleEmployee = await this.roleRepository.getEmployee();
    const { email, password: _password } = registrationEmployeeDto;
    const { salt, password } = await createCredentials(_password);
    const newUser = await this.userRepository.save({
      salt,
      email,
      password,
      role: roleEmployee,
    });

    await this.userSettingRepository.save({
      user_id: newUser.id
    })
    await this.userInfoRepository.save({
      first_name: registrationEmployeeDto.first_name,
      last_name: registrationEmployeeDto.last_name,
      job_title: registrationEmployeeDto.job_title,
      phone: registrationEmployeeDto.phone,
      user: newUser,
    });

    await this.companyEmployeeRepository.save({
      company_id: null,
      employee_id: newUser.id,
      status: CompanyEmployeeStatus.Pending,
    })
    return newUser;
  }

  async createCompany(
    registrationCompanyDto: RegistrationCompanyRequestDto,
  ) {
    const user = await this.userRepository.findByEmail(
      registrationCompanyDto.email,
    );

    if (user) throw new HttpException(USER_EXISTS, HttpStatus.FORBIDDEN);

    const { email, password: _password } = registrationCompanyDto;
    const rolePartner = await this.roleRepository.getPartner();

    const { salt, password } = await createCredentials(_password);
    const newUser = await this.userRepository.save({
      salt,
      email,
      password,
      role: rolePartner,
      phone: registrationCompanyDto.phone,
    });
    await this.userSettingRepository.save({
      user_id: newUser.id
    })
    await this.userInfoRepository.save({
      first_name: registrationCompanyDto.first_name,
      last_name: registrationCompanyDto.last_name,
      company_name: registrationCompanyDto.company_name,
      job_title: registrationCompanyDto.job_title,
      phone: registrationCompanyDto.phone,
      user: newUser,
    });
    const company = await this.companyRepository.save({
      inn: registrationCompanyDto.inn,
      name: registrationCompanyDto.company_name,
      company_business_line: registrationCompanyDto.company_business_line,
      employees_count: registrationCompanyDto.employees_count,
      site_url: registrationCompanyDto.site_url,
      promoted_products: registrationCompanyDto.promoted_products,
      products_of_interest: registrationCompanyDto.products_of_interest,
      main_customers: registrationCompanyDto.main_customers,
      owner: newUser,
      status: CompanyStatus.Pending,
    });

    await this.companyEmployeeRepository.save({
      company_id: company.id,
      employee_id: newUser.id,
      status: CompanyEmployeeStatus.Accept,
    })
    return newUser;
  }

  async createSuperAdmin(data: RegistrationSuperAdminDto) {
    if(!(data.secret === SECRET_KEY)) {
      throw new HttpException(USER_SECRET, HttpStatus.FORBIDDEN);
    }
    const userExist = await this.userRepository.findByEmail(data.email);

    if (userExist) throw new HttpException(USER_EXISTS, HttpStatus.FORBIDDEN);

    const { email, password: _password } = data;
    const roleSuperAdmin = await this.roleRepository.getSuperAdmin();
    console.log({roleSuperAdmin})
    const { salt, password } = await createCredentials(_password);
    const user = await this.userRepository.save({
      salt,
      email,
      password,
      role: roleSuperAdmin,
    });
    await this.userSettingRepository.save({
      user_id: user.id
    })
  }
  async findAll() {
    return await this.userRepository.find();
  }

  async findOne(id: number) {
    return await this.userRepository.findById(id);
  }

  async update(id, data: UpdateUserRequestDto) {
    const {email} = data
    const user = await this.userRepository.findByEmail(email);

    if(user) {
      throw new HttpException(EMAIl_EXISTS(email), HttpStatus.FORBIDDEN);
    }

    return await this.userRepository.update(id, {
      email,
    })
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async updatePassword(id: number, data: UpdatePasswordRequestDto, auth_user: any) {
    const user = await this.userRepository.findById(id);

    if (!user) throw new HttpException(USER_NOT_EXISTS, HttpStatus.FORBIDDEN);

    const isVerify = await verifyPassword({
      user_password: user.password,
      password: data.passwordPrev,
      salt: user.salt,
    });

    if (!isVerify) throw new HttpException('Неверный старый пароль', HttpStatus.FORBIDDEN);

    if (data.passwordPrev === data.passwordNew) throw new HttpException('Старый пароль не должен совпадать с новым', HttpStatus.FORBIDDEN);

    if (!(data.passwordNew === data.passwordNew2)) throw new HttpException('Пароли не совпадают', HttpStatus.FORBIDDEN);

    const passwordHashed = await createPassword({password: data.passwordNew, salt: user.salt})

    await this.userRepository.update(id, { password: passwordHashed });
  }
}
