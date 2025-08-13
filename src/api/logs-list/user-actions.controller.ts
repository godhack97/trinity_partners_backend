// GET /logs/paged?skip=0&take=20&action=update_profile
import { Controller, Get, Query } from "@nestjs/common";
import { UserActionsService } from "./user-actions.service";
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RoleTypes } from "@app/types/RoleTypes";
import { Roles } from "@decorators/Roles";

@Controller("logs-list")
@ApiBearerAuth()
@Roles([RoleTypes.SuperAdmin])
export class UserActionsController {
  constructor(private readonly userActionsService: UserActionsService) {}

  @Get("/count")
  @ApiResponse({ type: Number })
  async getCount() {
    return this.userActionsService.getCount();
  }

  // Все логи
  @Get()
  async getAll() {
    return this.userActionsService.findAll();
  }

  // Пагинация
  @Get("paged")
  async getPaged(
    @Query("skip") skip: string = "0",
    @Query("take") take: string = "20",
    @Query("action") action?: string,
  ) {
    if (action) {
      return this.userActionsService.findPagedByAction(
        action,
        Number(skip),
        Number(take),
      );
    }

    const { logs, total } = await this.userActionsService.findPaged(
      Number(skip),
      Number(take),
    );
    return { total, logs };
  }
}
