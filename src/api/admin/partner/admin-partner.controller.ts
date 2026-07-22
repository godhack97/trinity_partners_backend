import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  ValidationPipe,
  GoneException,
} from "@nestjs/common";
import AdminPartnerService from "./admin-partner.service";
import { Roles } from "../../../decorators/Roles";
import { ApiBearerAuth, ApiTags, ApiResponse, ApiOperation } from "@nestjs/swagger";
import { RoleTypes } from "../../../types/RoleTypes";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";
import { LogAction } from "src/logs/log-action.decorator";
import { CompanyStatus, UserEntity } from "@orm/entities";
import { AuthUser } from "@decorators/auth-user";
import { UpdatePartnerBusinessFieldsRequestDto } from "./dto/update-partner-business-fields.request.dto";

@ApiTags("partner")
@ApiBearerAuth()
@Controller("admin/partner")
@Roles([RoleTypes.SuperAdmin])
export class AdminPartnerController {
  constructor(private readonly adminPartnerService: AdminPartnerService) {}

  @Get("/count")
  @ApiOperation({ summary: 'Получить количество партнёров' })
  @ApiResponse({ type: Number })
  async getCount() {
    return this.adminPartnerService.getCount();
  }

  @Get("/count/pending")
  @ApiOperation({ summary: 'Получить количество партнёров (ожидающих принятия заявки)' })
  @ApiResponse({ type: Number })
  async getPendingCount() {
    return this.adminPartnerService.getCountByStatus(CompanyStatus.Pending);
  }

  @Get("/count/accepted")
  @ApiOperation({ summary: 'Получить количество партнёров (подтвержденных)' })
  @ApiResponse({ type: Number })
  async getAcceptedCount() {
    return this.adminPartnerService.getCountByStatus(CompanyStatus.Accept);
  }

  @Get("/count/rejected")
  @ApiOperation({ summary: 'Получить количество партнёров (отклонённых)' })
  @ApiResponse({ type: Number })
  async getRejectedCount() {
    return 0;
  }

  @Get("/count/suspended")
  @ApiOperation({ summary: 'Получить количество приостановленных партнёров' })
  @ApiResponse({ type: Number })
  async getSuspendedCount() {
    return this.adminPartnerService.getCountByStatus(CompanyStatus.Suspended);
  }

  @Get("employee/requests")
  @Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @ApiOperation({ summary: "Получить заявки сотрудников на проверку менеджером Тринити" })
  getEmployeeRequests(@AuthUser() auth_user: UserEntity) {
    return this.adminPartnerService.getEmployeeRequests(auth_user);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список партнёров' })
  getAll(@Query() filters: PartnerFilterRequestDto) {
    return this.adminPartnerService.getAll(filters);
  }

  @Patch(":id")
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("partner_update", "companies")
  @ApiOperation({ summary: "Обновить разрешённые бизнес-поля компании" })
  updateBusinessFields(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }))
    data: UpdatePartnerBusinessFieldsRequestDto,
  ) {
    throw new GoneException(
      "Редактирование компаний перенесено в раздел «Компании» партнёрского портала",
    );
  }

  @Post(":id/accept")
  @LogAction("partner_accept", "companies")
  @ApiOperation({ summary: 'Принять заявку от партнёра' })
  acceptPartner(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() auth_user: UserEntity,
  ) {
    throw new GoneException(
      "Подтверждение компаний перенесено в раздел «Компании» партнёрского портала",
    );
  }

  @Post(":id/reject")
  @LogAction("partner_reject", "companies")
  @ApiOperation({ summary: 'Отклонить заявку от партнёра' })
  rejectPartner(@Param("id", ParseIntPipe) id: number) {
    throw new GoneException(
      "Отклонение заявки удалено. Используйте блокировку заявки с обязательной причиной",
    );
  }

  @Post("employee/:id/accept")
  @Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @LogAction("employee_trinity_accept", "company_employees")
  @ApiOperation({ summary: "Принять заявку сотрудника менеджером Тринити" })
  acceptEmployee(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() auth_user: UserEntity,
  ) {
    return this.adminPartnerService.acceptEmployee(id, auth_user);
  }

  @Post("employee/:id/reject")
  @Roles([RoleTypes.SuperAdmin, RoleTypes.PartnerManager])
  @LogAction("employee_trinity_reject", "company_employees")
  @ApiOperation({ summary: "Отклонить заявку сотрудника менеджером Тринити" })
  rejectEmployee(@Param("id", ParseIntPipe) id: number) {
    return this.adminPartnerService.rejectEmployee(id);
  }

  @Post(":id/suspend")
  @LogAction("partner_suspend", "companies")
  @ApiOperation({ summary: 'Приостановить доступ партнёра' })
  suspendPartner(@Param("id", ParseIntPipe) id: number) {
    throw new GoneException(
      "Приостановка компаний перенесена в раздел «Компании» и требует причину",
    );
  }

  @Post(":id/restore")
  @LogAction("partner_restore", "companies")
  @ApiOperation({ summary: 'Восстановить ранее отклонённого партнёра' })
  restorePartner(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() auth_user: UserEntity,
  ) {
    throw new GoneException(
      "Восстановление отклонённых заявок удалено из новой модели модерации",
    );
  }

  @Post(":id/resume")
  @LogAction("partner_resume", "companies")
  @ApiOperation({ summary: 'Возобновить доступ приостановленного партнёра' })
  resumePartner(
    @Param("id", ParseIntPipe) id: number,
    @AuthUser() auth_user: UserEntity,
  ) {
    throw new GoneException(
      "Возобновление компаний перенесено в раздел «Компании» партнёрского портала",
    );
  }
}
