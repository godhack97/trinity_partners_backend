import { NewsController } from "@api/news/news.controller";
import { NewsService } from "@api/news/news.service";
import { Module } from "@nestjs/common";

@Module({
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}