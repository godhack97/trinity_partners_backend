import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { DealChannelEntity } from "./deal-channel.entity";
import { UserEntity } from "./user.entity";

@Entity({ name: "deal_channel_reads" })
@Index("UQ_deal_channel_read_user", ["channel_id", "user_id"], { unique: true })
export class DealChannelReadEntity extends BasisEntity {
  @Column({ type: "int" })
  channel_id: number;

  @ManyToOne(() => DealChannelEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "channel_id" })
  channel?: DealChannelEntity;

  @Column({ type: "int" })
  user_id: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: UserEntity;

  @Column({ type: "int", nullable: true })
  last_read_message_id?: number | null;

  @Column({ type: "datetime", nullable: true })
  last_read_at?: Date | null;
}
