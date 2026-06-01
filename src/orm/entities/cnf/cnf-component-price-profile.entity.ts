import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_component_price_profiles" })
export class CnfComponentPriceProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  base_price: number;

  @Column({ default: "USD" })
  currency: string;

  @Column({ type: "decimal", precision: 8, scale: 4, default: 3.6 })
  coefficient: number;

  @Column({ default: "component_price" })
  price_mode: string;

  @Column({ default: true })
  price_required: boolean;
}
