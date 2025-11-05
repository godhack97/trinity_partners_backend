import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { AdminDistributorService } from "./admin-distributor.service";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { AddDistributorRequestDto } from "./dto/request/add-distributor.request.dto";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("distributor")
@ApiBearerAuth()
@Roles([RoleTypes.SuperAdmin])
@Controller("admin/distributor")
export class AdminDistributorController {
  constructor(
    private readonly adminDistributorService: AdminDistributorService,
  ) {}

  @Post("add")
  @LogAction("distributor_add", "distributors")
  @ApiOperation({ summary: 'Создать дистрибьютора' })
  addDistributor(@Body() addDistributorDto: AddDistributorRequestDto) {
    return this.adminDistributorService.addDistributor(addDistributorDto);
  }

  @Post(":id/update")
  @LogAction("distributor_update", "distributors")
  @ApiOperation({ summary: 'Обновить дистрибьютора' })
  updateDistributor(
    @Param("id") id: string,
    @Body() data: AddDistributorRequestDto,
  ) {
    return this.adminDistributorService.updateDistributor(id, data);
  }

  @Post(":id/delete")
  @LogAction("distributor_delete", "distributors")
  @ApiOperation({ summary: 'Удалить дистрибьютора' })
  deleteDistributor(@Param("id") id: string) {
    return this.adminDistributorService.deleteDistributor(id);
  }
}
