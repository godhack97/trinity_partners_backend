import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { DealEntity, UserEntity } from ".";

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

  @Column({ type: "timestamp", nullable: true })
  processed_at?: Date;
}
