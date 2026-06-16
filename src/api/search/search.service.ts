import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DealEntity } from "@orm/entities/deal.entity";
import { NewsEntity } from "@orm/entities/news.entity";
import { DocumentEntity } from "@orm/entities/document.entity";
import { ConfiguratorDraftEntity } from "@orm/entities/configurator-draft.entity";
import { transliterator } from "@app/utils/transliterator";
import { Brackets, Repository } from "typeorm";

type SearchQuery = {
  variants: string[];
};

type SearchResult<T> = {
  items: T[];
  total: number;
};

type SimilarResult = {
  type: "deal" | "configuration" | "document" | "news";
  id: number;
  title: string;
  subtitle?: string | null;
  url: string;
};

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

  async search(
    authUser: any,
    query: string,
    limit: number = 10,
    page: number = 1,
  ) {
    const searchQuery = this.createSearchQuery(query);
    const offset = (page - 1) * limit;

    const [
      dealsResult,
      configurationsResult,
      documentsResult,
      newsResult,
    ] = await Promise.all([
      this.searchDeals(authUser, searchQuery, limit, offset),
      this.searchConfigurations(authUser, searchQuery, limit, offset),
      this.searchDocuments(searchQuery, limit, offset),
      this.searchNews(searchQuery, limit, offset),
    ]);

    const totals = {
      deals: dealsResult.total,
      configurations: configurationsResult.total,
      documents: documentsResult.total,
      news: newsResult.total,
    };
    const total =
      totals.deals + totals.configurations + totals.documents + totals.news;
    const totalPages = Math.max(
      ...Object.values(totals).map((count) => Math.ceil(count / limit)),
      0,
    );
    const similar =
      total === 0 && query.trim().length >= 5
        ? await this.searchSimilar(authUser, query)
        : [];

    return {
      deals: dealsResult.items,
      configurations: configurationsResult.items,
      documents: documentsResult.items,
      news: newsResult.items,
      similar,
      meta: {
        page,
        limit,
        total,
        totalPages,
        totals,
      },
    };
  }

  private async searchDeals(
    authUser: any,
    searchQuery: SearchQuery,
    limit: number,
    offset: number,
  ): Promise<
    SearchResult<{
      id: number;
      number: string;
      title: string | null;
      customer: string | null;
      status: string;
    }>
  > {
    const fields = ["deal.deal_num", "deal.title", "customer.company_name"];
    const { sql, params } = this.buildSearchSql(
      "dealSearch",
      fields,
      searchQuery,
    );

    const qb = this.dealRepo
      .createQueryBuilder("deal")
      .leftJoinAndSelect("deal.customer", "customer")
      .where("deal.creator_id = :userId", { userId: authUser.id })
      .andWhere(new Brackets((qb) => qb.where(sql, params)))
      .addSelect(
        this.buildRankSql("dealRank", fields, searchQuery),
        "search_rank",
      )
      .setParameters(this.buildRankParams("dealRank", searchQuery))
      .orderBy("search_rank", "DESC")
      .addOrderBy("deal.id", "DESC")
      .skip(offset)
      .take(limit);

    const [deals, total] = await qb.getManyAndCount();

    return {
      items: deals.map((d) => ({
        id: d.id,
        number: d.deal_num,
        title: d.title || null,
        customer: d.customer?.company_name || null,
        status: d.status,
      })),
      total,
    };
  }

  private async searchConfigurations(
    authUser: any,
    searchQuery: SearchQuery,
    limit: number,
    offset: number,
  ): Promise<
    SearchResult<{
      id: number;
      name: string;
      server_id: string | null;
    }>
  > {
    const fields = ["draft.title", "draft.description"];
    const { sql, params } = this.buildSearchSql(
      "draftSearch",
      fields,
      searchQuery,
    );
    const [drafts, total] = await this.draftRepo
      .createQueryBuilder("draft")
      .where("draft.creator_id = :userId", { userId: authUser.id })
      .andWhere("draft.deleted_at IS NULL")
      .andWhere(new Brackets((qb) => qb.where(sql, params)))
      .addSelect(
        this.buildRankSql("draftRank", fields, searchQuery),
        "search_rank",
      )
      .setParameters(this.buildRankParams("draftRank", searchQuery))
      .orderBy("search_rank", "DESC")
      .addOrderBy("draft.id", "DESC")
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items: drafts.map((d) => ({
        id: d.id,
        name: d.title,
        server_id: d.server_id || null,
      })),
      total,
    };
  }

  private async searchDocuments(
    searchQuery: SearchQuery,
    limit: number,
    offset: number,
  ): Promise<
    SearchResult<{
      id: number;
      name: string;
      group: string | null;
    }>
  > {
    const fields = ["doc.name", "doc.file_path", "documentGroup.name"];
    const { sql, params } = this.buildSearchSql(
      "docSearch",
      fields,
      searchQuery,
    );
    const [docs, total] = await this.documentRepo
      .createQueryBuilder("doc")
      .leftJoinAndSelect("doc.group", "documentGroup")
      .andWhere(new Brackets((qb) => qb.where(sql, params)))
      .addSelect(
        this.buildRankSql("docRank", fields, searchQuery),
        "search_rank",
      )
      .setParameters(this.buildRankParams("docRank", searchQuery))
      .orderBy("search_rank", "DESC")
      .addOrderBy("doc.id", "DESC")
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items: docs.map((d) => ({
        id: d.id,
        name: d.name,
        group: d.group?.name || null,
      })),
      total,
    };
  }

  private async searchNews(
    searchQuery: SearchQuery,
    limit: number,
    offset: number,
  ): Promise<
    SearchResult<{
      id: number;
      title: string;
      url: string;
      date: unknown;
    }>
  > {
    const fields = ["news.name", "news.content"];
    const { sql, params } = this.buildSearchSql(
      "newsSearch",
      fields,
      searchQuery,
    );
    const [items, total] = await this.newsRepo
      .createQueryBuilder("news")
      .where("news.deleted_at IS NULL")
      .andWhere(new Brackets((qb) => qb.where(sql, params)))
      .addSelect(
        this.buildRankSql("newsRank", fields, searchQuery),
        "search_rank",
      )
      .setParameters(this.buildRankParams("newsRank", searchQuery))
      .orderBy("search_rank", "DESC")
      .addOrderBy("news.id", "DESC")
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.name,
        url: n.url,
        date: n.created_at,
      })),
      total,
    };
  }

  private async searchSimilar(
    authUser: any,
    query: string,
  ): Promise<SimilarResult[]> {
    const tokens = this.getSimilarTokens(query);
    const similar = new Map<string, SimilarResult>();

    for (const token of tokens) {
      const searchQuery = this.createSearchQuery(token);
      const [deals, configurations, documents, news] = await Promise.all([
        this.searchDeals(authUser, searchQuery, 3, 0),
        this.searchConfigurations(authUser, searchQuery, 3, 0),
        this.searchDocuments(searchQuery, 3, 0),
        this.searchNews(searchQuery, 3, 0),
      ]);

      deals.items.forEach((deal) => {
        similar.set(`deal-${deal.id}`, {
          type: "deal",
          id: deal.id,
          title: `№${deal.number}${deal.title ? ` - ${deal.title}` : ""}`,
          subtitle: deal.customer,
          url: `/deals.management/${deal.id}`,
        });
      });
      configurations.items.forEach((config) => {
        similar.set(`configuration-${config.id}`, {
          type: "configuration",
          id: config.id,
          title: config.name,
          url: config.server_id
            ? `/configurator/${config.server_id}?draft=${config.id}`
            : `/configurator?draft=${config.id}`,
        });
      });
      documents.items.forEach((doc) => {
        similar.set(`document-${doc.id}`, {
          type: "document",
          id: doc.id,
          title: doc.name,
          subtitle: doc.group,
          url: "/download-centr",
        });
      });
      news.items.forEach((item) => {
        similar.set(`news-${item.id}`, {
          type: "news",
          id: item.id,
          title: item.title,
          url: `/news/${item.url}`,
        });
      });
    }

    return Array.from(similar.values()).slice(0, 10);
  }

  private createSearchQuery(query: string): SearchQuery {
    const raw = query.trim().toLowerCase();
    const variants = new Set<string>([raw, transliterator(raw)]);
    const synonymPairs = [["bios", "биос"]];

    synonymPairs.forEach(([latin, cyrillic]) => {
      if (raw.includes(latin)) {
        variants.add(raw.replace(new RegExp(latin, "g"), cyrillic));
      }
      if (raw.includes(cyrillic)) {
        variants.add(raw.replace(new RegExp(cyrillic, "g"), latin));
      }
    });

    return {
      variants: Array.from(variants).filter(Boolean),
    };
  }

  private buildSearchSql(
    paramPrefix: string,
    fields: string[],
    searchQuery: SearchQuery,
  ) {
    const params: Record<string, string> = {};
    const clauses: string[] = [];

    searchQuery.variants.forEach((variant, index) => {
      const paramName = `${paramPrefix}Contains${index}`;
      params[paramName] = `%${variant}%`;
      fields.forEach((field) => {
        clauses.push(`LOWER(COALESCE(${field}, '')) LIKE :${paramName}`);
      });
    });

    return {
      sql: clauses.join(" OR "),
      params,
    };
  }

  private buildRankSql(
    paramPrefix: string,
    fields: string[],
    searchQuery: SearchQuery,
  ) {
    const exactClauses: string[] = [];
    const prefixClauses: string[] = [];
    const containsClauses: string[] = [];

    searchQuery.variants.forEach((_, index) => {
      fields.forEach((field) => {
        const normalizedField = `LOWER(COALESCE(${field}, ''))`;
        exactClauses.push(
          `${normalizedField} = :${paramPrefix}Exact${index}`,
        );
        prefixClauses.push(
          `${normalizedField} LIKE :${paramPrefix}Prefix${index}`,
        );
        containsClauses.push(
          `${normalizedField} LIKE :${paramPrefix}Contains${index}`,
        );
      });
    });

    return `
      CASE
        WHEN ${exactClauses.join(" OR ")} THEN 100
        WHEN ${prefixClauses.join(" OR ")} THEN 80
        WHEN ${containsClauses.join(" OR ")} THEN 60
        ELSE 0
      END
    `;
  }

  private buildRankParams(paramPrefix: string, searchQuery: SearchQuery) {
    const params: Record<string, string> = {};

    searchQuery.variants.forEach((variant, index) => {
      params[`${paramPrefix}Exact${index}`] = variant;
      params[`${paramPrefix}Prefix${index}`] = `${variant}%`;
      params[`${paramPrefix}Contains${index}`] = `%${variant}%`;
    });

    return params;
  }

  private getSimilarTokens(query: string) {
    return Array.from(
      new Set(
        query
          .trim()
          .toLowerCase()
          .split(/[^0-9a-zа-яё]+/i)
          .map((token) => token.trim())
          .filter((token) => token.length >= 3),
      ),
    ).slice(0, 4);
  }
}
