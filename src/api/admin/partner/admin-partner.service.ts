import { CompanyEmployeeRepository, CompanyRepository, UserRepository } from "../../../orm/repositories";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CompanyEmployeeStatus, CompanyStatus } from "../../../orm/entities";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";

@Injectable()
export default class AdminPartnerService {

  constructor(

    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userRepository: UserRepository

  ) {}

  async getAll( filters: PartnerFilterRequestDto ) {

    const qb = this.companyRepository.createQueryBuilder('cmp');
    
    qb.leftJoinAndMapOne(
      "cmp.owner",
      "users",
      "usr",
      "usr.id = cmp.owner"
    );

    qb.leftJoinAndMapOne(
      "usr.info",
      "users_info",
      "uinf",
      "uinf.user_id = usr.id"
    );

    filters?.status &&
      qb.andWhere("cmp.status = :s", { s: filters.status });
    

    const data = await qb.getMany();

    return data;

  }

  async accept(id: number) {
    const companyEntity = await this.companyRepository.findOneBy({id});

    if (!companyEntity) throw new HttpException(`Компания не найдена: ${id}`, HttpStatus.FORBIDDEN);

    await this.companyRepository.update(id, {
      status: CompanyStatus.Accept,
    })

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({employee_id: companyEntity.owner_id});

    if (!companyEmployee) throw new HttpException('Сотрудник не найдена', HttpStatus.FORBIDDEN);

    await this.companyEmployeeRepository.update(companyEmployee.id, {status: CompanyEmployeeStatus.Accept});
  }
}