import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  ManyToMany,
  OneToOne,
} from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";

export enum CompanyStatus {
  Pending = "pending",
  Accept = "accept",
  Reject = "reject",
  Suspended = "suspended",
}

export enum PartnershipType {
  Integrator = "integrator",
  Distributor = "distributor",
}

export enum PartnerLevel {
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
  Platinum = "platinum",
}

@Entity({
  name: "companies",
})
export class CompanyEntity extends BasisEntity {
  @Column()
  inn: string;

  @Column()
  owner_id: number;

  @Column({ nullable: true })
  validated_by_manager_id?: number;

  @Column({ type: "timestamp", nullable: true })
  validated_at?: Date;

  @Column({ nullable: true, unsigned: true })
  responsible_manager_id?: number | null;

  @Column({ nullable: true, unsigned: true })
  approved_by_user_id?: number | null;

  @Column({ type: "timestamp", nullable: true })
  approved_at?: Date | null;

  @Column({ nullable: true })
  contact_email?: string | null;

  @Column({ nullable: true })
  contact_phone?: string | null;

  @Column({ type: "timestamp", nullable: true })
  review_locked_at?: Date | null;

  @Column({ nullable: true, unsigned: true })
  review_locked_by_user_id?: number | null;

  @Column({ type: "text", nullable: true })
  review_lock_reason?: string | null;

  @Column({ type: "timestamp", nullable: true })
  suspended_at?: Date | null;

  @Column({ nullable: true, unsigned: true })
  suspended_by_user_id?: number | null;

  @Column({ type: "text", nullable: true })
  suspension_reason?: string | null;

  @Column()
  name: string;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "owner_id" })
  owner: UserEntity;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "validated_by_manager_id" })
  validated_by_manager?: UserEntity;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "responsible_manager_id" })
  responsible_manager?: UserEntity | null;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "approved_by_user_id" })
  approved_by_user?: UserEntity | null;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "review_locked_by_user_id" })
  review_locked_by_user?: UserEntity | null;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "suspended_by_user_id" })
  suspended_by_user?: UserEntity | null;

  @ManyToMany(() => UserEntity)
  @JoinTable({
    name: "company_employees",
    joinColumn: {
      // name: 'employee_id',
      // referencedColumnName: 'id',
      name: "company_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      // name: 'company_id',
      // referencedColumnName: 'id',
      name: "employee_id",
      referencedColumnName: "id",
    },
  })
  employee: UserEntity[];

  @Column()
  company_business_line: string;

  @Column()
  employees_count: number;

  @Column()
  site_url: string;

  @Column()
  promoted_products: string;

  @Column()
  products_of_interest: string;

  @Column()
  main_customers: string;

  @Column({ nullable: true })
  email_domain?: string;

  @Column({
    type: "enum",
    enum: PartnershipType,
    default: PartnershipType.Integrator,
  })
  partnership_type: PartnershipType;

  @Column({
    type: "enum",
    enum: CompanyStatus,
    default: CompanyStatus.Pending,
  })
  status: CompanyStatus;

  @Column({
    type: "enum",
    enum: PartnerLevel,
    nullable: true,
    comment: "Уровень партнёра",
  })
  partner_level: PartnerLevel | null;

  @Column({ type: "date", nullable: true, comment: "Срок действия сертификата" })
  certificate_expiry: Date | null;
}
