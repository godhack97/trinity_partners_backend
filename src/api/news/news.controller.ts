import { UpdateMultislotRequestDto } from "@api/admin/configurator/multislot/dto/request/update-multislot.request.dto";
import { NewsService } from "@api/news/news.service";
import {
  Body,
  Controller,
  Get,
  Param,
  Post
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags
} from "@nestjs/swagger";

@ApiTags('news')
@ApiBearerAuth()
@Controller("news")
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async findAll() {
    return this.newsService.findAll();
  }

  @Get('/:id')
  async findOne(@Param('id') id: string) {
    return this.newsService.findOne(+id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.newsService.create(data);
  }

  @Post('/:id')
  async update(@Param('id') id: string, @Body() data: any ) {
    return this.newsService.update(data);
  }
}