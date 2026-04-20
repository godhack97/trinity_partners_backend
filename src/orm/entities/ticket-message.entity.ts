import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";
import { TicketEntity } from "./ticket.entity";

@Entity({
  name: "ticket_messages",
  orderBy: {
    id: "ASC",
  },
})
export class TicketMessageEntity extends BasisEntity {
  @Column()
  ticket_id: number;

  @ManyToOne(() => TicketEntity, (ticket) => ticket.messages)
  @JoinColumn({ name: "ticket_id" })
  ticket: TicketEntity;

  @Column()
  sender_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "sender_id" })
  sender: UserEntity;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "json", nullable: true })
  attachments?: string[];
}
