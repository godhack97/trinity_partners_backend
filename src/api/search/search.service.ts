import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DealEntity } from "@orm/entities/deal.entity";
import { NewsEntity } from "@orm/entities/news.entity";
import { DocumentEntity } from "@orm/entities/document.entity";
import { ConfiguratorDraftEntity } from "@orm/entities/configurator-draft.entity";
import { Repository, Like, IsNull } from "typeorm";

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(DealEntity)
    private readonly dealRepo: Repository<DealEntity>,
    @InjectRepository(NewsEntity)
    private readonly newsRepo: Repository<NewsEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(ConfiguratorDraftEntity)
    private readonly draftRepo: Repository<ConfiguratorDraftEntity>,
  ) {}

  async search(authUser: any, query: string, limit: number = 5) {
    const search = `%${query.toLowerCase()}%`;

    const [deals, configurations, documents, news] = await Promise.all([
      this.searchDeals(authUser, search, limit),
      this.searchConfigurations(authUser, search, limit),
      this.searchDocuments(search, limit),
      this.searchNews(search, limit),
    ]);

    return { deals, configurations, documents, news };
  }

  private async searchDeals(authUser: any, search: string, limit: number) {
    const qb = this.dealRepo
      .createQueryBuilder("deal")
      .leftJoinAndSelect("deal.customer", "customer")
      .where("deal.creator_id = :userId", { userId: authUser.id })
      .andWhere(
        "(LOWER(deal.deal_num) LIKE :search OR LOWER(deal.title) LIKE :search)",
        { search },
      )
      .orderBy("deal.id", "DESC")
      .take(limit);

    const deals = await qb.getMany();

    return deals.map((d) => ({
      id: d.id,
      number: d.deal_num,
      title: d.title || null,
      customer: d.customer?.company_name || null,
      status: d.status,
    }));
  }

  private async searchConfigurations(
    authUser: any,
    search: string,
    limit: number,
  ) {
    const drafts = await this.draftRepo.find({
      where: {
        creator_id: authUser.id,
        title: Like(search),
        deletedAt: IsNull(),
      },
      order: { id: "DESC" },
      take: limit,
    });

    return drafts.map((d) => ({
      id: d.id,
      name: d.title,
      server_id: d.server_id || null,
    }));
  }

  private async searchDocuments(search: string, limit: number) {
    const docs = await this.documentRepo.find({
      where: { name: Like(search) },
      relations: ["group"],
      order: { id: "DESC" },
      take: limit,
    });

    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      group: d.group?.name || null,
    }));
  }

  private async searchNews(search: string, limit: number) {
    const items = await this.newsRepo
      .createQueryBuilder("news")
      .where("news.deleted_at IS NULL")
      .andWhere(
        "(LOWER(news.name) LIKE :search OR LOWER(news.content) LIKE :search)",
        { search },
      )
      .orderBy("news.id", "DESC")
      .take(limit)
      .getMany();

    return items.map((n) => ({
      id: n.id,
      title: n.name,
      url: n.url,
      date: n.created_at,
    }));
  }
}
