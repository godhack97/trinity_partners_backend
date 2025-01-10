import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { NewsEntity } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class NewsRepository extends Repository<NewsEntity> {
  constructor(
    @InjectRepository(NewsEntity)
    private repo: Repository<NewsEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findById(id: number) {
    return await this.findOneBy({ id });
  }
  public async findBySlug({ slug } : { slug: string}) {
    return await this.findOneBy({ url: slug });
  }
  public async findBySlugOrName({ slug, name } : { slug: string, name: string }) {
    return await this.findOneBy([{
      url: slug,
      name,
    }]);
  }
}