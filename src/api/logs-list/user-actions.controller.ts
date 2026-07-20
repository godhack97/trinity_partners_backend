// GET /logs/paged?skip=0&take=20&action=update_profile
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ValidationPipe,
} from "@nestjs/common";
import { UserActionsService } from "./user-actions.service";
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags, ApiOperation } from "@nestjs/swagger";
import { RoleTypes } from "@app/types/RoleTypes";
import { Roles } from "@decorators/Roles";
import { LogsPagedRequestDto } from "./dto/logs-paged.request.dto";
import { LogsPagedResponseDto } from "./dto/logs-paged.response.dto";

@Controller("logs-list")
@ApiTags('logs-list')
@ApiBearerAuth()
@Roles([RoleTypes.SuperAdmin])
export class UserActionsController {
  constructor(private readonly userActionsService: UserActionsService) { }

  @Get("/count")
  @ApiOperation({ summary: 'Получить количество логов системы' })
  @ApiResponse({ type: Number })
  async getCount() {
    return this.userActionsService.getCount();
  }

  @Get("entity/backup-operations")
  @ApiOperation({ summary: 'Получить логи связанные с бекапами компонент' })
  async getEntityBulkOperations( ) {
    return this.userActionsService.findEntityBackupOperations();
  }

  @Get("entity")
  @ApiOperation({ summary: 'Получить логи по сущности' })
  async getEntityHistory(
    @Query("entity") entity,
    @Query("id") id,
  ) {
    if (!entity) {
      throw new BadRequestException("entity is required");
    }
  
    const entities = Array.isArray(entity) ? entity : [entity];
    const ids = Array.isArray(id) ? id : [id];
  
    if (entities.length !== ids.length) {
      throw new BadRequestException("entity и id должны быть одинаковой длины");
    }
  
    const results = await Promise.all(
      entities.map((ent, idx) =>
        this.userActionsService.findByEntity(ent, ids[idx])
      )
    );
  
    return results.flat().sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }

  // Все логи
  @Get()
  @ApiOperation({ summary: 'Получить список логов' })
  async getAll() {
    return this.userActionsService.findAll();
  }

  // Пагинация
  @Get("paged")
  @ApiOkResponse({ type: LogsPagedResponseDto })
  async getPaged(@Query(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) filters: LogsPagedRequestDto) {
    return this.userActionsService.findPaged(filters);
  }
}
