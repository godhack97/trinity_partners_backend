import { AfterLoad, Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";
import { TicketMessageEntity } from "./ticket-message.entity";
import { UserIdentityEntity } from "./user-identity.entity";

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

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "creator_id", referencedColumnName: "id" })
  creator_identity?: UserIdentityEntity;

  @Column({ nullable: true })
  assignee_id?: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "assignee_id" })
  assignee?: UserEntity;

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "assignee_id", referencedColumnName: "id" })
  assignee_identity?: UserIdentityEntity;

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

  // Виртуальное поле, вычисляется в сервисе
  unread_count?: number;

  @AfterLoad()
  useHistoricalUsers() {
    if (!this.creator && this.creator_identity) {
      this.creator = this.creator_identity.toHistoricalUser();
    }
    if (!this.assignee && this.assignee_identity) {
      this.assignee = this.assignee_identity.toHistoricalUser();
    }
  }
}
