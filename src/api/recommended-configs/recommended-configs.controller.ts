import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  Delete,
  Put,
  ParseIntPipe,
  ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { RecommendedConfigsService } from "./recommended-configs.service";
import {
  CreateRecommendedConfigDto,
  UpdateRecommendedConfigDto,
} from "./dto/request/create-recommended-config.dto";
import { RecommendedConfigResponseDto } from "./dto/response/recommended-config-response.dto";
import { Roles } from "@decorators/Roles";
import { RoleTypes } from "@app/types/RoleTypes";
import { LogAction } from "@app/logs/log-action.decorator";

@ApiTags("configurator-recommended")
@ApiBearerAuth()
@Controller("configurator/recommended")
export class RecommendedConfigsController {
  constructor(
    private readonly configsService: RecommendedConfigsService,
  ) {}

  @Get()
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto, isArray: true })
  @ApiQuery({ name: "serverId", required: false, type: String })
  findAll(@Query("serverId") serverId?: string) {
    return this.configsService.findAll(serverId);
  }

  @Get("admin")
  @Roles([RoleTypes.SuperAdmin])
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto, isArray: true })
  findAllAdmin() {
    return this.configsService.findAllAdmin();
  }

  @Get("count")
  @ApiResponse({ type: Number })
  getCount() {
    return this.configsService.getCount();
  }

  @Get(":id")
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.configsService.findOne(id);
  }

  @Post()
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("recommended_config_add", "recommended_configs")
  @ApiBody({ type: () => CreateRecommendedConfigDto })
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto })
  create(
    @Body(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })) dto: CreateRecommendedConfigDto,
  ) {
    return this.configsService.create(dto);
  }

  @Put(":id")
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("recommended_config_update", "recommended_configs")
  @ApiBody({ type: () => UpdateRecommendedConfigDto })
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })) dto: UpdateRecommendedConfigDto,
  ) {
    return this.configsService.update(id, dto);
  }

  @Delete(":id")
  @Roles([RoleTypes.SuperAdmin])
  @LogAction("recommended_config_delete", "recommended_configs")
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.configsService.remove(id);
    return { message: "Конфигурация удалена" };
  }
}
