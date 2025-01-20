import { NewsRequestDto } from "@api/news/dto/news.request.dto";
import {
  NewsResponseDto,
  NewsResponseListDto
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
  UseInterceptors
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { UserEntity } from "@orm/entities";

@ApiTags('news')
@ApiBearerAuth()
@Controller("news")
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @UseInterceptors(new TransformResponse(NewsResponseListDto, true))
  @ApiResponse({ type: NewsResponseListDto })
  async findAll() {
    return this.newsService.findAll();
  }

  @Get('/:slug')
  @UseInterceptors(new TransformResponse(NewsResponseDto))
  @ApiResponse({ type: NewsResponseDto })
  async findOne(@Param('slug') slug: string) {
    return this.newsService.findOne(slug);
  }

  @Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
  @Post()
  @UseInterceptors(new TransformResponse(NewsResponseDto))
  @ApiResponse({ type: NewsResponseDto })
  async create(@Body() data: NewsRequestDto, @AuthUser() auth_user: Partial<UserEntity>) {
    return this.newsService.create(data, auth_user);
  }

  @Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
  @Post('/:slug')
  @UseInterceptors(new TransformResponse(NewsResponseDto))
  @ApiResponse({ type: NewsResponseDto })
  async update(@Param('slug') slug: string, @Body() data: NewsRequestDto) {
    return this.newsService.update(slug, data);
  }

  @Roles([RoleTypes.SuperAdmin, RoleTypes.ContentManager])
  @Post('/:slug/delete')
  async delete(@Param('slug') slug: string) {
    return this.newsService.delete(slug);
  }
}