import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import {
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { InternalServerErrorException } from "@nestjs/common/exceptions/internal-server-error.exception";
import { ConfigService } from "@nestjs/config";
import {
  CompanyEmployeeStatus,
  CompanyStatus
} from "@orm/entities";
import {
  CompanyEmployeeRepository,
  CompanyRepository,
  UserRepository
} from "@orm/repositories";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";

@Injectable()
export default class AdminPartnerService {

  constructor(

    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly configService: ConfigService,

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

    qb.andWhere("usr.email_confirmed = 1");

    filters?.status &&
      qb.andWhere("cmp.status = :s", { s: filters.status });

    return await qb.getMany();

  }

  async accept(id: number) {
    const companyEntity = await this.companyRepository.findOneBy({id});

    if (!companyEntity) throw new HttpException(`Компания не найдена: ${id}`, HttpStatus.FORBIDDEN);

    await this.companyRepository.update(id, {
      status: CompanyStatus.Accept,
    })

    await this.userRepository.update(companyEntity.owner_id, {
      is_activated: true,
    })

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({employee_id: companyEntity.owner_id});

    if (!companyEmployee) throw new HttpException('Сотрудник не найдена', HttpStatus.FORBIDDEN);

    await this.companyEmployeeRepository.update(companyEmployee.id, {status: CompanyEmployeeStatus.Accept});

    const user = await this.userRepository.findById(companyEntity.owner_id);

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: 'Подтверждение регистрации!',
      template: 'request-company-approve',
      context: {
        link: 'https://partner.trinity.ru/',
        URL: this.configService.get('FRONTEND_HOSTNAME')
      }
    })
  }

  async reject(id: number) {
    const companyEntity = await this.companyRepository.findOneBy({id});

    if (!companyEntity) throw new HttpException(`Компания не найдена: ${id}`, HttpStatus.FORBIDDEN);

    const updateResult =await this.companyRepository.update(id, {
      status: CompanyStatus.Reject,
    })

    if (updateResult.affected === 0) throw new InternalServerErrorException('Не удалось обновить');

    await this.userRepository.update(companyEntity.owner_id, {
      is_activated: false,
    })

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({employee_id: companyEntity.owner_id});

    if (!companyEmployee) throw new HttpException('Сотрудник не найдена', HttpStatus.FORBIDDEN);

    await this.companyEmployeeRepository.update(companyEmployee.id, {status: CompanyEmployeeStatus.Reject});

    const user = await this.userRepository.findById(companyEntity.owner_id);

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: 'Регистрация отклонена!',
      template: 'request-company-reject',
      context: {
        link: 'https://partner.trinity.ru/',
        URL: this.configService.get('FRONTEND_HOSTNAME')
      }
      //html: 'К сожалению, на данный момент доступ не одобрен. Если Вы не согласны с решением администратора или считаете. что произошла ошибка, свяжитесь с нами по почте: <a href="mailto:support@trinity.ru">support@trinity.ru</a>'
    })
  }
}