import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CompanyEntity, CustomerEntity, DistributorEntity, UserEntity } from ".";
import { DeleteDateColumn } from "typeorm";

export enum DealStatus {
  Draft = "draft",
  Registered = "registered",
  Canceled = "canceled",
  Moderation = "moderation",
  Win = "win",
  Lose = "loose",
}

export const DealStatusRu = {
  draft: "черновик",
  registered: "зарегистрирована",
  canceled: "не зарегистрирована",
  moderation: "на рассмотрении",
  win: "выиграна",
  loose: "отменена",
};

export enum Bitrix24SyncStatus {
  PENDING = "pending",
  PROCESSING = "processing",
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
    name: "bitrix24_sync_started_at",
    type: "datetime",
    precision: 6,
    nullable: true,
    comment: "Начало текущей аренды синхронизации с Bitrix24",
  })
  bitrix24_sync_started_at?: Date | null;

  @Column({
    name: "bitrix24_sync_token",
    type: "varchar",
    length: 36,
    nullable: true,
    select: false,
    comment: "Токен владельца текущей аренды синхронизации с Bitrix24",
  })
  bitrix24_sync_token?: string | null;

  @Column({
    name: "bitrix24_synced_at",
    type: "timestamp",
    nullable: true,
    comment: "Время последней синхронизации с Bitrix24",
  })
  bitrix24_synced_at?: Date;

  @Column({ type: "int", nullable: true })
  distributor_id?: number | null;

  @ManyToOne(
    () => DistributorEntity,
    (distributor: DistributorEntity) => distributor.id,
    { eager: true, nullable: true },
  )
  @JoinColumn({ name: "distributor_id" })
  distributor?: DistributorEntity | null;

  @Column({ type: "int", unsigned: true, nullable: true })
  distributor_company_id?: number | null;

  @ManyToOne(() => CompanyEntity, (company: CompanyEntity) => company.id, {
    eager: true,
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "distributor_company_id" })
  distributor_company?: CompanyEntity | null;

  @Column({ nullable: true })
  integrator_company_id?: number;

  @Column({ nullable: true })
  integrator_name?: string;

  @Column({ nullable: true })
  integrator_inn?: string;

  @Column({
    name: "bitrix24_integrator_contact_id",
    type: "int",
    unsigned: true,
    nullable: true,
  })
  bitrix24_integrator_contact_id?: number;

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

  @Column({ type: "int", unsigned: true, nullable: true })
  creator_company_id?: number | null;

  @ManyToOne(() => CompanyEntity, (company: CompanyEntity) => company.id, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "creator_company_id" })
  creator_company?: CompanyEntity | null;

  @Column({
    type: "enum",
    enum: DealType,
    default: DealType.Partner,
  })
  deal_type: DealType;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "creator_id" })
  partner: UserEntity;

  @Column({ type: "int", unsigned: true, nullable: true })
  responsible_manager_id?: number | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "responsible_manager_id" })
  responsible_manager?: UserEntity | null;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  deal_sum: number;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  final_deal_sum?: number | null;

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

  @Column({ type: "datetime", nullable: true })
  purchase_due_email_sent_at: Date | null;

  @Column({ type: "datetime", nullable: true })
  purchase_reminder_7_days_sent_at: Date | null;

  @Column({ type: "datetime", nullable: true })
  purchase_reminder_3_days_sent_at: Date | null;

  @Column({ type: "datetime", nullable: true })
  purchase_reminder_1_day_sent_at: Date | null;

  @Column({ type: "datetime", nullable: true })
  purchase_due_web_notified_at: Date | null;

  @Column()
  comment: string;

  @Column({ type: "json", nullable: true })
  comments?: unknown[];

  @Column({
    type: "enum",
    enum: DealStatus,
    default: DealStatus.Draft,
  })
  status: DealStatus;

  @Column({ type: "datetime", nullable: true })
  registration_expires_at?: Date | null;

  @Column({ type: "int", nullable: true })
  duplicate_of_deal_id?: number | null;

  @ManyToOne(() => DealEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "duplicate_of_deal_id" })
  duplicate_of_deal?: DealEntity | null;

  @Column({
    type: "enum",
    enum: DealDuplicateReviewStatus,
    nullable: true,
  })
  duplicate_review_status?: DealDuplicateReviewStatus | null;

  @Column({ type: "int", unsigned: true, nullable: true })
  duplicate_reviewed_by_user_id?: number | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "duplicate_reviewed_by_user_id" })
  duplicate_reviewed_by_user?: UserEntity | null;

  @Column({ type: "datetime", nullable: true })
  duplicate_reviewed_at?: Date | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  duplicate_review_comment?: string | null;

  @Column({ nullable: true, type: "varchar" })
  special_discount: string | null;

  @Column({ nullable: true, type: "decimal", precision: 10, scale: 2 })
  special_price: number | null;

  @Column({ nullable: true })
  discount_date: Date | null;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date;
}
