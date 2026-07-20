import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { BasisEntity } from "./basis.entity";

@Entity({
  name: "news",
  orderBy: {
    id: "DESC",
  },
})
export class NewsEntity extends BasisEntity {
  @Column()
  name: string;

  @Column({ type: "text" })
  content: string;

  @Column()
  author_id: number;

  @Column()
  url: string;

  @Column({ nullable: true })
  photo: string | null;

  @Column({ nullable: true })
  image_big: string | null;

  @DeleteDateColumn()
  deleted_at: Date;
}
