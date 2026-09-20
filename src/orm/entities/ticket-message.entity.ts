import { AfterLoad, Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";
import { TicketEntity } from "./ticket.entity";
import { UserIdentityEntity } from "./user-identity.entity";

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

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "sender_id", referencedColumnName: "id" })
  sender_identity?: UserIdentityEntity;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "json", nullable: true })
  attachments?: string[];

  @Column({ default: false })
  is_read: boolean;

  // Нет в БД — заполняется в сервисе после загрузки relations
  sender_name?: string | null;

  @AfterLoad()
  useHistoricalSender() {
    if (!this.sender && this.sender_identity) {
      this.sender = this.sender_identity.toHistoricalUser();
    }
  }
}
