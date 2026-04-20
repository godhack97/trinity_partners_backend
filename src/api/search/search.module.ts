import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DealEntity } from "@orm/entities/deal.entity";
import { NewsEntity } from "@orm/entities/news.entity";
import { DocumentEntity } from "@orm/entities/document.entity";
import { ConfiguratorDraftEntity } from "@orm/entities/configurator-draft.entity";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DealEntity,
      NewsEntity,
      DocumentEntity,
      ConfiguratorDraftEntity,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
