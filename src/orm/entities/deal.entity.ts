import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CompanyEntity, CustomerEntity, DistributorEntity, UserEntity } from ".";
import { DeleteDateColumn } from "typeorm";

export enum DealStatus {
  Registered = "registered",
  Canceled = "canceled",
  Moderation = "moderation",
  Win = "win",
  Lose = "loose",
}

export const DealStatusRu = {
  registered: "зарегистрирована",
  canceled: "не зарегистрирована",
  moderation: "на рассмотрении",
  win: "выиграна",
  loose: "проиграна",
};

export enum Bitrix24SyncStatus {
  PENDING = "pending",
  SYNCED = "synced",
  FAILED = "failed",
}

export enum DealDuplicateReviewStatus {
  Pending = "pending",
  Duplicate = "duplicate",
  NotDuplicate = "not_duplicate",
}

export enum DealType {
  Partner = "partner",
  TrinityStaff = "trinity_staff",
}

@Entity({
  name: "deals",
  orderBy: {
    id: "DESC",
  },
})
export class DealEntity extends BasisEntity {
  @Column()
  deal_num: string;

  @Column({
    name: "bitrix24_deal_id",
    type: "int",
    unsigned: true,
    nullable: true,
    comment: "ID сделки в Bitrix24",
  })
  bitrix24_deal_id?: number;

  @Column({
    name: "bitrix24_sync_status",
    type: "enum",
    enum: Bitrix24SyncStatus,
    default: Bitrix24SyncStatus.PENDING,
    comment: "Статус синхронизации с Bitrix24",
  })
  bitrix24_sync_status: Bitrix24SyncStatus;

  @Column({
    name: "bitrix24_synced_at",
    type: "timestamp",
    nullable: true,
    comment: "Время последней синхронизации с Bitrix24",
  })
  bitrix24_synced_at?: Date;

  @Column()
  distributor_id: number;

  @ManyToOne(
    () => DistributorEntity,
    (distributor: DistributorEntity) => distributor.id,
    { eager: true },
  )
  @JoinColumn({ name: "distributor_id" })
  distributor: DistributorEntity;

  @Column({ nullable: true })
  integrator_company_id?: number;

  @ManyToOne(() => CompanyEntity, (company: CompanyEntity) => company.id, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: "integrator_company_id" })
  integrator_company?: CompanyEntity;

  @Column()
  customer_id: number;

  @ManyToOne(() => CustomerEntity, (customer: CustomerEntity) => customer.id, {
    eager: true,
  })
  @JoinColumn({ name: "customer_id" })
  customer: CustomerEntity;

  @Column()
  creator_id: number;

  @Column({
    type: "enum",
    enum: DealType,
    default: DealType.Partner,
  })
  deal_type: DealType;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "creator_id" })
  partner: UserEntity;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  deal_sum: number;

  @Column()
  competition_link: string;

  @Column({ nullable: true })
  configuration_link?: string;

  @Column({ type: "json", nullable: true })
  configurations?: unknown[];

  @Column({ type: "json", nullable: true })
  attachments?: unknown[];

  @Column()
  purchase_date: Date;

  @Column({ type: "datetime", nullable: true })
  purchase_overdue_notified_at: Date | null;

  @Column()
  comment: string;

  @Column({
    type: "enum",
    enum: DealStatus,
    default: DealStatus.Moderation,
  })
  status: DealStatus;

  @Column({ nullable: true })
  duplicate_of_deal_id?: number;

  @Column({
    type: "enum",
    enum: DealDuplicateReviewStatus,
    nullable: true,
  })
  duplicate_review_status?: DealDuplicateReviewStatus;

  @Column({ nullable: true, type: "varchar" })
  special_discount: string;

  @Column({ nullable: true, type: "decimal", precision: 10, scale: 2 })
  special_price: number;

  @Column({ nullable: true })
  discount_date: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;
}
