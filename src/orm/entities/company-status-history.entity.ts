import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CompanyEntity } from "./company.entity";
import { CompanyIdentityEntity } from "./company-identity.entity";
import { UserEntity } from "./user.entity";
import { UserIdentityEntity } from "./user-identity.entity";

export enum CompanyLifecycleAction {
  Approved = "approved",
  ReviewLocked = "review_locked",
  ReviewUnlocked = "review_unlocked",
  Suspended = "suspended",
  Resumed = "resumed",
  ManagerAssigned = "manager_assigned",
  ContactsUpdated = "contacts_updated",
  Archived = "archived",
  Restored = "restored",
  PermanentlyDeleted = "permanently_deleted",
  LegacyRejectedMigrated = "legacy_rejected_migrated",
  LegacyManagerAssignmentCleared = "legacy_manager_assignment_cleared",
}

@Entity({ name: "company_status_history" })
export class CompanyStatusHistoryEntity extends BasisEntity {
  @Column({ unsigned: true })
  company_id: number;

  @ManyToOne(() => CompanyEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: CompanyEntity;

  @ManyToOne(() => CompanyIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "company_id", referencedColumnName: "id" })
  company_identity?: CompanyIdentityEntity;

  @Column({ length: 64 })
  action: CompanyLifecycleAction | string;

  @Column({ nullable: true, length: 32 })
  from_status?: string | null;

  @Column({ nullable: true, length: 32 })
  to_status?: string | null;

  @Column({ nullable: true, unsigned: true })
  actor_user_id?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "actor_user_id" })
  actor?: UserEntity | null;

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "actor_user_id", referencedColumnName: "id" })
  actor_identity?: UserIdentityEntity | null;

  @Column({ nullable: true, unsigned: true })
  responsible_manager_id?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "responsible_manager_id" })
  responsible_manager?: UserEntity | null;

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "responsible_manager_id", referencedColumnName: "id" })
  responsible_manager_identity?: UserIdentityEntity | null;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @Column({ type: "json", nullable: true })
  details?: Record<string, unknown> | null;

  @AfterLoad()
  useHistoricalUsers() {
    if (!this.company && this.company_identity) {
      this.company = this.company_identity.toHistoricalCompany();
    }
    if (!this.actor && this.actor_identity) {
      this.actor = this.actor_identity.toHistoricalUser();
    }
    if (!this.responsible_manager && this.responsible_manager_identity) {
      this.responsible_manager =
        this.responsible_manager_identity.toHistoricalUser();
    }
  }
}
