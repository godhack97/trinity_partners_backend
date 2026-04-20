import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";

@Entity({
  name: "configurator_drafts",
  orderBy: {
    id: "DESC",
  },
})
export class ConfiguratorDraftEntity extends BasisEntity {
  @Column()
  creator_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "creator_id" })
  creator: UserEntity;

  @Column({ length: 255 })
  title: string;

  @Column({ name: "server_id", type: "varchar", length: 36, nullable: true })
  server_id?: string;

  @Column({ name: "serverbox_height_id", type: "varchar", length: 36, nullable: true })
  serverbox_height_id?: string;

  @Column({ type: "json", nullable: true })
  components: any;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total_price: number;

  @Column({ type: "text", nullable: true })
  description?: string;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;
}
