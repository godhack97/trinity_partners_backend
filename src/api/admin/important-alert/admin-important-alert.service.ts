import { NotEntityException } from "@app/filters/not-entity.exception";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { CompanyRepository, ImportantAlertRepository } from "@orm/repositories";
import { CreateImportantAlertDto } from "./dto/create-important-alert.dto";
import { UpdateImportantAlertDto } from "./dto/update-important-alert.dto";

@Injectable()
export class AdminImportantAlertService {
  constructor(
    private readonly importantAlertRepository: ImportantAlertRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async getCount(): Promise<number> {
    return await this.importantAlertRepository.createQueryBuilder().getCount();
  }

  async findAll() {
    return await this.importantAlertRepository.findAll();
  }

  async findOne(id: number) {
    const alert = await this.importantAlertRepository.findById(id);
    if (!alert) throw new NotEntityException();
    return alert;
  }

  async findTargetCompanies() {
    return this.companyRepository.find({
      select: { id: true, name: true, inn: true, status: true },
      order: { name: "ASC" },
    });
  }

  async create(data: CreateImportantAlertDto, authorId: number) {
    await this.assertTargetCompany(data.target_company_id);
    return await this.importantAlertRepository.save({
      ...data,
      author_id: authorId,
    });
  }

  async update(id: number, data: UpdateImportantAlertDto) {
    const alert = await this.importantAlertRepository.findById(id);
    if (!alert) throw new NotEntityException();
    if (data.target_company_id !== undefined) {
      await this.assertTargetCompany(data.target_company_id);
    }

    const updateData: Partial<UpdateImportantAlertDto> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.target_company_id !== undefined) {
      updateData.target_company_id = data.target_company_id;
    }

    const updateResult = await this.importantAlertRepository.update(id, updateData);

    if (updateResult.affected === 0) {
      throw new HttpException(
        "Не удалось обновить",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return await this.importantAlertRepository.findById(id);
  }

  private async assertTargetCompany(targetCompanyId?: number | null) {
    if (targetCompanyId == null) return;
    const company = await this.companyRepository.findOneBy({ id: targetCompanyId });
    if (!company) {
      throw new BadRequestException("Целевая компания не найдена");
    }
  }

  async delete(id: number) {
    const alert = await this.importantAlertRepository.findById(id);
    if (!alert) throw new NotEntityException();

    const deleteResult = await this.importantAlertRepository.softDelete(id);

    if (deleteResult.affected === 0) {
      throw new HttpException(
        "Не удалось удалить",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return;
  }
}
