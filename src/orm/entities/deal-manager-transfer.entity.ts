import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { DealEntity } from "./deal.entity";

@Entity({ name: "deal_manager_transfers" })
@Index("IDX_deal_manager_transfers_deal", ["deal_id", "created_at"])
export class DealManagerTransferEntity extends BasisEntity {
  @Column({ type: "int" })
  deal_id: number;

  @ManyToOne(() => DealEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deal_id" })
  deal?: DealEntity;

  @Column({ type: "int", nullable: true })
  previous_manager_id?: number | null;

  @Column({ type: "int" })
  new_manager_id: number;

  @Column({ type: "int" })
  transferred_by: number;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason?: string | null;
}
