import { Column, DeleteDateColumn, Entity } from "typeorm";
import { BasisEntity } from "./basis.entity";

@Entity({
  name: "recommended_configs",
  orderBy: {
    id: "ASC",
  },
})
export class RecommendedConfigEntity extends BasisEntity {
  @Column({ length: 50 })
  category: string;

  @Column({ length: 100 })
  category_label: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  server_id: string;

  @Column({ length: 255, nullable: true })
  server_name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "json", nullable: true })
  components: { componentId: string; amount: number }[];

  @Column({ length: 500, nullable: true })
  image: string;

  @Column({ default: true })
  is_active: boolean;

  @DeleteDateColumn({ name: "deleted_at" })
  deleted_at: Date;
}
