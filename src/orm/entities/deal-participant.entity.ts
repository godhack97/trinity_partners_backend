import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CompanyEntity } from "./company.entity";
import { DealEntity } from "./deal.entity";
import { UserEntity } from "./user.entity";

export enum DealParticipantParty {
  Vendor = "vendor",
  Partner = "partner",
  Distributor = "distributor",
}

@Entity({ name: "deal_participants" })
@Index("UQ_deal_participant_user", ["deal_id", "user_id"], { unique: true })
export class DealParticipantEntity extends BasisEntity {
  @Column({ type: "int" })
  deal_id: number;

  @ManyToOne(() => DealEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deal_id" })
  deal?: DealEntity;

  @Column({ type: "int" })
  user_id: number;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user?: UserEntity;

  @Column({ type: "int" })
  company_id: number;

  @ManyToOne(() => CompanyEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "company_id" })
  company?: CompanyEntity;

  @Column({ type: "enum", enum: DealParticipantParty })
  party_type: DealParticipantParty;

  @Column({ type: "varchar", length: 64, nullable: true })
  participant_role?: string | null;

  @Column({ type: "int", nullable: true })
  added_by?: number | null;

  @Column({ type: "datetime", nullable: true })
  removed_at?: Date | null;

  @Column({ type: "int", nullable: true })
  removed_by?: number | null;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
