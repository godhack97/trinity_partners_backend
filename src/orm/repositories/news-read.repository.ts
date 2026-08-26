import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { NewsEntity, NewsReadEntity } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class NewsReadRepository extends Repository<NewsReadEntity> {
  constructor(
    @InjectRepository(NewsReadEntity)
    private repo: Repository<NewsReadEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async countUnread(userId: number): Promise<number> {
    return this.repo.manager
      .getRepository(NewsEntity)
      .createQueryBuilder("news")
      .leftJoin(
        NewsReadEntity,
        "news_read",
        "news_read.news_id = news.id AND news_read.user_id = :userId",
        { userId },
      )
      .where("news_read.id IS NULL")
      .getCount();
  }

  async markRead(userId: number, newsId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(NewsReadEntity)
      .values({ user_id: userId, news_id: newsId })
      .orIgnore()
      .execute();
  }
}
