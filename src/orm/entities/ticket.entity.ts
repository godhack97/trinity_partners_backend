import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";
import { TicketMessageEntity } from "./ticket-message.entity";

@Entity({
  name: "tickets",
  orderBy: {
    id: "DESC",
  },
})
export class TicketEntity extends BasisEntity {
  @Column()
  creator_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "creator_id" })
  creator: UserEntity;

  @Column({ type: "enum", enum: ["manager", "tech_specialist"] })
  type: "manager" | "tech_specialist";

  @Column({ length: 255 })
  subject: string;

  @Column({ type: "enum", enum: ["open", "in_progress", "closed"], default: "open" })
  status: "open" | "in_progress" | "closed";

  @Column({ name: "configuration_id", nullable: true })
  configuration_id?: number;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;

  @OneToMany(() => TicketMessageEntity, (msg) => msg.ticket, { eager: true })
  messages: TicketMessageEntity[];
}
