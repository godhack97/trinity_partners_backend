import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CompanyEntity } from "./company.entity";
import { UserEntity } from "./user.entity";

export enum CompanyLifecycleAction {
  Approved = "approved",
  ReviewLocked = "review_locked",
  ReviewUnlocked = "review_unlocked",
  Suspended = "suspended",
  Resumed = "resumed",
  ManagerAssigned = "manager_assigned",
  ContactsUpdated = "contacts_updated",
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

  @Column({ nullable: true, unsigned: true })
  responsible_manager_id?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "responsible_manager_id" })
  responsible_manager?: UserEntity | null;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @Column({ type: "json", nullable: true })
  details?: Record<string, unknown> | null;
}
