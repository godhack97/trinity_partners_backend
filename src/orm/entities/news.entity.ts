import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne
} from "typeorm";
import { BasisEntity } from "./basis.entity";

@Entity({
  name: "news",
  orderBy: {
    id: "DESC"
  }
})
export class NewsEntity extends BasisEntity {
  @Column()
  name: string;

  @Column()
  content: string;

  @Column()
  author_id: number;

  @Column()
  url: string;

  @Column()
  photo: string;

  @DeleteDateColumn()
  deleted_at: Date;
}
