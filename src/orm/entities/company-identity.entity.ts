import { Column, Entity, PrimaryColumn } from "typeorm";
import { CompanyEntity, PartnershipType } from "./company.entity";

/**
 * Historical company directory entry. Business records keep pointing to this
 * row after the operational company record is permanently removed.
 */
@Entity({ name: "company_identities" })
export class CompanyIdentityEntity {
  @PrimaryColumn({ type: "int", unsigned: true })
  id: number;

  @Column()
  name: string;

  @Column()
  inn: string;

  @Column({ length: 32 })
  partnership_type: PartnershipType;

  @Column({ type: "int", unsigned: true, nullable: true })
  owner_user_id?: number | null;

  @Column({ type: "json", nullable: true })
  profile_snapshot?: Record<string, unknown> | null;

  @Column({ type: "timestamp", nullable: true })
  company_created_at?: Date | null;

  @Column({ type: "timestamp", nullable: true })
  permanently_deleted_at?: Date | null;

  @Column({ type: "int", unsigned: true, nullable: true })
  deleted_by_user_id?: number | null;

  @Column({ nullable: true })
  deleted_by_email?: string | null;

  toHistoricalCompany(): CompanyEntity {
    return {
      id: this.id,
      name: this.name,
      inn: this.inn,
      partnership_type: this.partnership_type,
      owner_id: this.owner_user_id,
      deleted_at: this.permanently_deleted_at,
      ...(this.profile_snapshot || {}),
    } as unknown as CompanyEntity;
  }
}
