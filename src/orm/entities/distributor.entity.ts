import { Column, Entity, Timestamp } from "typeorm";
import { BasisEntity } from "./basis.entity";

@Entity({
  name: "distributors",
})
export class DistributorEntity extends BasisEntity {
  @Column()
  name: string;

  @Column({ type: "timestamp", nullable: true })
  deleted_at: Date | null;
}
