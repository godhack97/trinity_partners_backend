import { AfterLoad, Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { DealEntity, UserEntity } from ".";
import { UserIdentityEntity } from "./user-identity.entity";

export enum DealDeletionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity({
  name: "deal_deletion_requests",
  orderBy: {
    id: "DESC",
  },
})
export class DealDeletionRequestEntity extends BasisEntity {
  @Column({ type: "int", unsigned: true })
  deal_id: number;

  @ManyToOne(() => DealEntity, (deal: DealEntity) => deal.id, { eager: false })
  @JoinColumn({ name: "deal_id" })
  deal: DealEntity;

  @Column({ type: "int", unsigned: true })
  requester_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: false })
  @JoinColumn({ name: "requester_id" })
  requester: UserEntity;

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "requester_id", referencedColumnName: "id" })
  requester_identity?: UserIdentityEntity;

  @Column({ type: "text" })
  deletion_reason: string;

  @Column({
    type: "enum",
    enum: DealDeletionStatus,
    default: DealDeletionStatus.PENDING,
  })
  status: DealDeletionStatus;

  @Column({ type: "int", unsigned: true, nullable: true })
  processed_by_id?: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: false })
  @JoinColumn({ name: "processed_by_id" })
  processed_by?: UserEntity;

  @ManyToOne(() => UserIdentityEntity, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: "processed_by_id", referencedColumnName: "id" })
  processed_by_identity?: UserIdentityEntity;

  @Column({ type: "timestamp", nullable: true })
  processed_at?: Date;

  @AfterLoad()
  useHistoricalUsers() {
    if (!this.requester && this.requester_identity) {
      this.requester = this.requester_identity.toHistoricalUser();
    }
    if (!this.processed_by && this.processed_by_identity) {
      this.processed_by = this.processed_by_identity.toHistoricalUser();
    }
  }
}
