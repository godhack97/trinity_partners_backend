import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CompanyEntity } from "./company.entity";
import { UserEntity } from "./user.entity";

export enum CompanyNotificationOutboxChannel {
  Email = "email",
  Site = "site",
}

export enum CompanyNotificationOutboxStatus {
  Pending = "pending",
  Processing = "processing",
  Delivered = "delivered",
  Failed = "failed",
}

@Entity({ name: "company_notification_outbox" })
@Index("UQ_company_notification_outbox_delivery_key", ["delivery_key"], {
  unique: true,
})
@Index("IDX_company_notification_outbox_due", ["status", "available_at"])
export class CompanyNotificationOutboxEntity extends BasisEntity {
  @Column({ unsigned: true })
  company_id: number;

  @ManyToOne(() => CompanyEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: CompanyEntity;

  @Column({ nullable: true, unsigned: true })
  user_id?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user?: UserEntity | null;

  @Column({ length: 191 })
  delivery_key: string;

  @Column({ type: "enum", enum: CompanyNotificationOutboxChannel })
  channel: CompanyNotificationOutboxChannel;

  @Column({ type: "enum", enum: CompanyNotificationOutboxStatus })
  status: CompanyNotificationOutboxStatus;

  @Column({ length: 255, nullable: true })
  recipient_email?: string | null;

  @Column({ type: "json" })
  payload: Record<string, unknown>;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  available_at: Date;

  @Column({ type: "timestamp", nullable: true })
  delivered_at?: Date | null;

  @Column({ length: 128, nullable: true })
  last_error?: string | null;
}
