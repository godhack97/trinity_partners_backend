import { NewsPaginationDto } from "@api/news/dto/news-pagination.dto";
import { NewsRequestDto } from "@api/news/dto/news.request.dto";
import {
  NewsResponseDto,
  NewsPaginationResponseDto,
} from "@api/news/dto/news.response.dto";
import { NewsService } from "@api/news/news.service";
import { RoleTypes } from "@app/types/RoleTypes";
import { AuthUser } from "@decorators/auth-user";
import { Roles } from "@decorators/Roles";
import { TransformResponse } from "@interceptors/transform-response.interceptor";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UserEntity } from "@orm/entities";
import { LogAction } from "src/logs/log-action.decorator";

@ApiTags("news")
@ApiBearerAuth()
@Controller("news")
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  //@UseInterceptors(new TransformResponse(PaginationResponseDto<NewsResponseListDto>))
  @ApiResponse({ type: NewsPaginationResponseDto })
  async findAll(@Query() filters: NewsPaginationDto) {
    return this.newsService.findAll(filters);
  }

  @Get("/count")
  @ApiResponse({ type: Number })
  async getCount() {
    return this.newsService.getCount();
  }

  @Get("/:slug")
  @UseInterceptors(new TransformResponse(NewsResponseDto))
  @ApiResponse({ type: NewsResponseDto })
  async findOne(@Param("slug") slug: string) {
    return this.newsService.findOne(slug);
  }

  @Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
  @Post()
  @LogAction("news_add", "news")
  @UseInterceptors(new TransformResponse(NewsResponseDto))
  @ApiResponse({ type: NewsResponseDto })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    data: NewsRequestDto,
    @AuthUser() auth_user: Partial<UserEntity>,
  ) {
    return this.newsService.create(data, auth_user);
  }

  @Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
  @Post("/:slug")
  @LogAction("news_update", "news")
  @UseInterceptors(new TransformResponse(NewsResponseDto))
  @ApiResponse({ type: NewsResponseDto })
  async update(
    @Param("slug") slug: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    data: NewsRequestDto,
  ) {
    return this.newsService.update(slug, data);
  }

  @Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
  @Post("/:slug/delete")
  @LogAction("news_delete", "news")
  async delete(@Param("slug") slug: string) {
    return this.newsService.delete(slug);
  }
}
