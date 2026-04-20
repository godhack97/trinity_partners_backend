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
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import { RecommendedConfigsService } from "./recommended-configs.service";
import { CreateRecommendedConfigDto } from "./dto/request/create-recommended-config.dto";
import { RecommendedConfigResponseDto } from "./dto/response/recommended-config-response.dto";

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

  @Get("count")
  @ApiResponse({ type: Number })
  getCount() {
    return this.configsService.getCount();
  }

  @Get(":id")
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto })
  findOne(@Param("id") id: string) {
    return this.configsService.findOne(+id);
  }

  @Post()
  @ApiBody({ type: () => CreateRecommendedConfigDto })
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto })
  create(@Body() dto: CreateRecommendedConfigDto) {
    return this.configsService.create(dto);
  }

  @Put(":id")
  @ApiBody({ type: () => CreateRecommendedConfigDto })
  @UseInterceptors(new TransformResponse(RecommendedConfigResponseDto))
  @ApiResponse({ type: RecommendedConfigResponseDto })
  update(
    @Param("id") id: string,
    @Body() dto: Partial<CreateRecommendedConfigDto>,
  ) {
    return this.configsService.update(+id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.configsService.remove(+id);
    return { message: "Конфигурация удалена" };
  }
}
