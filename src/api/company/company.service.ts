import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddEmployeeRequestDto } from './dto/request/add-employee.request.dto';
import { AuthTokenService } from '@app/services/auth-token/auth-token.service';
import { CompanyEmployeeRepository, CompanyRepository, UserInfoRepository, UserRepository } from '@orm/repositories';
import { RoleTypes } from '@app/types/RoleTypes';
import { CompanyEmployeeStatus } from '@orm/entities';
import { message } from '@decorators/validate/translate-ru';

@Injectable()
export class CompanyService {

  constructor(  
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userInfoRepository: UserInfoRepository
  ) {
  }

  async addEmplyee(request: Request, addEmployeeDto: AddEmployeeRequestDto) {
    const token = this.authTokenService.extractToken(request);
    const role =  await this.authTokenService.getUserRole(token);

    if(![RoleTypes.Partner, RoleTypes.EmployeeAdmin].includes(role.role as RoleTypes)) {
      throw new HttpException('У вас нет прав для данного действия', HttpStatus.FORBIDDEN);
    }

    //Получаем пользователя с сущностью CompanyEmployees и проверяем его статус, если он отклонен или в ожидании то добовляем его в сотрудники
    const user =  await this.userRepository.findByEmailWithCompanyEmployees(addEmployeeDto.email);
   
   

    if(!user || ![CompanyEmployeeStatus.Pending, CompanyEmployeeStatus.Reject].includes(user.company_employee.status) || user.role.name !==RoleTypes.Employee) {
      return { succes: false }
    }

    
    const companyId =  (await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(role.userId)).company_id;

    // Актуализировать имя компании у сотрудника.  В настоящее время у компании в бд нет поля company_name. Венутся после исправления

    // const companyName = await this.companyRepository.findById(companyId).company_name;

    // await this.userInfoRepository.update(user.user_info.id, {
    //   company_name: companyName,
    // })
    // console.log('companyName', companyName);
    
    // В текущей реализации перезаписываем company_id если оно было другое. Так как при создании пользователя это никак не проверятется
    await this.companyEmployeeRepository.update(user.company_employee.id, {
      company_id: companyId,
      employee_id: user.id,
      status: CompanyEmployeeStatus.Accept
    });
    //return user;
    // return await this.companyRepository.find({
    //   relations: ['employee']
    //   })
    return { succes: true }
  }

  findAll() {
    return `This action returns all company`;
  }

  findOne(id: number) {
    return `This action returns a #${id} company`;
  }

  update(id: number, updateCompanyDto:  AddEmployeeRequestDto) {
    return `This action updates a #${id} company`;
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}
