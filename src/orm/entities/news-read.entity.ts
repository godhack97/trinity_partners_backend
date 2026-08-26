import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { NewsEntity } from "./news.entity";
import { UserEntity } from "./user.entity";

@Entity({ name: "news_reads" })
@Index("UQ_news_reads_user_news", ["user_id", "news_id"], { unique: true })
export class NewsReadEntity extends BasisEntity {
  @Column({ unsigned: true })
  user_id: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column()
  news_id: number;

  @ManyToOne(() => NewsEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "news_id" })
  news: NewsEntity;
}
