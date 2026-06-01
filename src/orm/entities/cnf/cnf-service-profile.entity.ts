import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_service_profiles" })
export class CnfServiceProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column()
  service_level: string;

  @Column({ type: "int" })
  years: number;

  @Column()
  formula: string;

  @Column({ type: "decimal", precision: 8, scale: 4, nullable: true })
  percent: number;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  fixed_price: number;
}
