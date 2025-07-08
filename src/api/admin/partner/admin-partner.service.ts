import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import {
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { InternalServerErrorException } from "@nestjs/common/exceptions/internal-server-error.exception";
import {
  CompanyEmployeeStatus,
  CompanyStatus
} from "@orm/entities";
import {
  CompanyEmployeeRepository,
  CompanyRepository,
  UserRepository,
  DealRepository,
} from "@orm/repositories";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";

@Injectable()
export default class AdminPartnerService {

  constructor(

    private readonly companyRepository: CompanyRepository,
    private readonly dealRepository: DealRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
  ) { }

  async getCount(): Promise<number> {
    const qb = this.companyRepository.createQueryBuilder('cmp');

    qb.leftJoinAndMapOne(
      "cmp.owner",
      "users",
      "usr",
      "usr.id = cmp.owner"
    );

    qb.andWhere("usr.email_confirmed = 1");

    return await qb.getCount();
  }

  async getCountByStatus(status: CompanyStatus): Promise<number> {
    const qb = this.companyRepository.createQueryBuilder('cmp');

    qb.leftJoinAndMapOne(
      "cmp.owner",
      "users",
      "usr",
      "usr.id = cmp.owner"
    );

    qb.andWhere("usr.email_confirmed = 1");
    qb.andWhere("cmp.status = :s", { s: status });

    return await qb.getCount();
  }

  async getAll(filters: PartnerFilterRequestDto) {

    const qb = this.companyRepository.createQueryBuilder('cmp');

    qb.leftJoinAndMapOne(
      "cmp.owner",
      "users",
      "usr",
      "usr.id = cmp.owner_id"
    );

    qb.leftJoinAndMapOne(
      "usr.info",
      "users_info",
      "uinf",
      "uinf.user_id = usr.id"
    );

    qb.andWhere("usr.email_confirmed = 1");

    filters?.status &&
      qb.andWhere("cmp.status = :s", { s: filters.status });

    const companies = await qb.getMany();

    // Получаем ID пользователей и компаний для агрегации
    const userIds = companies.map(c => c.owner.id);
    const companyIds = companies.map(c => c.id);

    // Подсчет сделок по создателям
    const dealsCount = await this.dealRepository
      .createQueryBuilder('deals')
      .select('deals.creator_id', 'creator_id')
      .addSelect('COUNT(deals.id)', 'count')
      .where('deals.creator_id IN (:...userIds)', { userIds })
      .groupBy('deals.creator_id')
      .getRawMany();

    // Подсчет активных сотрудников по компаниям
    const employeesCount = await this.companyEmployeeRepository
      .createQueryBuilder('ce')
      .select('ce.company_id', 'company_id')
      .addSelect('COUNT(ce.id)', 'count')
      .where('ce.company_id IN (:...companyIds)', { companyIds })
      .andWhere('ce.status = :status', { status: 'accept' })
      .groupBy('ce.company_id')
      .getRawMany();

    // Создаем карты для быстрого поиска
    const dealsMap = new Map(dealsCount.map(d => [d.creator_id, parseInt(d.count)]));
    const employeesMap = new Map(employeesCount.map(e => [e.company_id, parseInt(e.count)]));

    // Добавляем данные к компаниям
    return companies.map(company => ({
      ...company,
      dealsCount: dealsMap.get(company.owner.id) || 0,
      employeesCount: employeesMap.get(company.id) || 0
    }));

  }

  async accept(id: number) {
    const companyEntity = await this.companyRepository.findOneBy({ id });

    if (!companyEntity) throw new HttpException(`Компания не найдена: ${id}`, HttpStatus.FORBIDDEN);

    await this.companyRepository.update(id, {
      status: CompanyStatus.Accept,
    })

    await this.userRepository.updateUser(companyEntity.owner_id, {
      is_activated: true,
    })

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({ employee_id: companyEntity.owner_id });

    if (!companyEmployee) throw new HttpException('Сотрудник не найдена', HttpStatus.FORBIDDEN);

    await this.companyEmployeeRepository.update(companyEmployee.id, { status: CompanyEmployeeStatus.Accept });

    const user = await this.userRepository.findById(companyEntity.owner_id);

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: 'Подтверждение регистрации!',
      template: 'request-company-approve',
      context: {
        link: 'https://partner.trinity.ru/'
      }
    })
  }

  async reject(id: number) {
    const companyEntity = await this.companyRepository.findOneBy({ id });

    if (!companyEntity) throw new HttpException(`Компания не найдена: ${id}`, HttpStatus.FORBIDDEN);

    const updateResult = await this.companyRepository.update(id, {
      status: CompanyStatus.Reject,
    })

    if (updateResult.affected === 0) throw new InternalServerErrorException('Не удалось обновить');

    await this.userRepository.update(companyEntity.owner_id, {
      is_activated: false,
    })

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({ employee_id: companyEntity.owner_id });

    if (!companyEmployee) throw new HttpException('Сотрудник не найдена', HttpStatus.FORBIDDEN);

    await this.companyEmployeeRepository.update(companyEmployee.id, { status: CompanyEmployeeStatus.Reject });

    const user = await this.userRepository.findById(companyEntity.owner_id);

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: 'Регистрация отклонена!',
      template: 'request-company-reject',
      context: {
        link: 'https://partner.trinity.ru/'
      }
      //html: 'К сожалению, на данный момент доступ не одобрен. Если Вы не согласны с решением администратора или считаете. что произошла ошибка, свяжитесь с нами по почте: <a href="mailto:support@trinity.ru">support@trinity.ru</a>'
    })
  }
}