import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddEmployeeRequestDto } from './dto/request/add-employee.request.dto';
import { AuthTokenService } from '@app/services/auth-token/auth-token.service';
import { CompanyEmployeeRepository, CompanyRepository, RoleRepository, UserInfoRepository, UserRepository } from '@orm/repositories';
import { RoleTypes } from '@app/types/RoleTypes';
import { CompanyEmployeeStatus } from '@orm/entities';
import { AddEmployeeAdminRequestDto } from './dto/request/add-employee-admin-request.dto';

@Injectable()
export class CompanyService {

  constructor(  
    private readonly userRepository: UserRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userInfoRepository: UserInfoRepository,
    private readonly roleRepository: RoleRepository
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

    const companyName = (await this.companyRepository.findById(companyId)).name;

    await this.userInfoRepository.update(user.user_info.id, {
      company_name: companyName,
    })
    
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

  async getCompanyEmployees(request: Request) {
    const token = this.authTokenService.extractToken(request);
    const role =  await this.authTokenService.getUserRole(token);

    if(![RoleTypes.Partner, RoleTypes.EmployeeAdmin, RoleTypes.SuperAdmin].includes(role.role as RoleTypes)) {
      throw new HttpException('У вас нет прав для данного действия', HttpStatus.FORBIDDEN);
    }

    if(role.role===RoleTypes.SuperAdmin){
      return await this.companyEmployeeRepository.findAllCompanyEmployeesWithUsersAndInfo()
    }

    if([RoleTypes.Partner, RoleTypes.EmployeeAdmin].includes(role.role as RoleTypes)) {
      return await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(role.companyId);
    }
  }

  async changeStatusEmployeeAdmin(request: Request, id: number, body: AddEmployeeAdminRequestDto) {
    const { user } = await this.checkUserPermissions(request, id);
     
    const newRoleName = body.isEmployeeAdmin ? RoleTypes.EmployeeAdmin : RoleTypes.Employee;

    const newRole =  await this.roleRepository.findByRole(newRoleName);
   
    const updateResult = await this.userRepository.update(user.id, {
      role: newRole,
      });
      
    if (updateResult.affected === 0) {
      throw new HttpException('Не удалось обновить роль пользователя', HttpStatus.INTERNAL_SERVER_ERROR);
    }
      
    return {
      message: `Роль сотрудника ${user.id} была успешно заменена на ${newRoleName}`,
      succes: true,
    };  
  }


  async removeEmployee(request: Request, id: number) {

    const { user } = await this.checkUserPermissions(request, id);

    await this.companyEmployeeRepository.update(user.company_employee.id, {
      status: CompanyEmployeeStatus.Deleted
    });

    //return await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(user.id);

    return {
      message: `Cотрудник c ${user.id} был успешно удален`,
      succes: true,
    };
  }

  private async checkUserPermissions(request: Request, id: number) {
    const token = this.authTokenService.extractToken(request);
    const role = await this.authTokenService.getUserRole(token);
    
    if (![RoleTypes.Partner, RoleTypes.EmployeeAdmin].includes(role.role as RoleTypes)) {
      throw new HttpException('У вас нет прав для данного действия', HttpStatus.FORBIDDEN);
    }
    
    const user = await this.userRepository.findByIdWithCompanyEmployees(id);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    if (![RoleTypes.Employee, RoleTypes.EmployeeAdmin].includes(user.role.name as RoleTypes)) {
      throw new HttpException('Только сотрудникам можно менять статус', HttpStatus.FORBIDDEN);
    }
    
    if (!user.company_employee?.company_id 
      || user.company_employee?.company_id !== role.companyId 
      || user.company_employee?.status !== CompanyEmployeeStatus.Accept) {
      throw new HttpException('Данный пользователь не является вашим сотрудником или его статус не подтвержден', HttpStatus.FORBIDDEN);
    }
    
    return { user, role };
  }
}
