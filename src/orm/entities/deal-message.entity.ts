import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { DealChannelEntity } from "./deal-channel.entity";
import { UserEntity } from "./user.entity";

@Entity({ name: "deal_messages" })
@Index("IDX_deal_messages_channel_created", ["channel_id", "created_at"])
export class DealMessageEntity extends BasisEntity {
  @Column({ type: "int" })
  channel_id: number;

  @ManyToOne(() => DealChannelEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "channel_id" })
  channel?: DealChannelEntity;

  @Column({ type: "int" })
  author_id: number;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "author_id" })
  author?: UserEntity;

  @Column({ type: "int", nullable: true })
  author_company_id?: number | null;

  @Column({ type: "text" })
  text: string;

  @Column({ type: "json", nullable: true })
  attachments?: unknown[] | null;

  @DeleteDateColumn({ type: "datetime", nullable: true })
  deleted_at?: Date | null;
}
