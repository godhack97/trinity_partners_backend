import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_component_resource_profiles" })
export class CnfComponentResourceProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column({ default: "none" })
  resource_kind: string;

  @Column({ type: "int", default: 0 })
  pcie_lanes: number;

  @Column({ type: "int", default: 0 })
  rear_pcie_lanes: number;

  @Column({ type: "int", default: 0 })
  physical_slots: number;

  @Column({ type: "int", default: 0 })
  ocp_slots: number;

  @Column({ type: "int", default: 0 })
  internal_ports: number;

  @Column({ type: "int", nullable: true })
  power_w: number;

  @Column({ default: true })
  uses_power: boolean;
}
