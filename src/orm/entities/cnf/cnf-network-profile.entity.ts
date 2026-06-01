import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_network_profiles" })
export class CnfNetworkProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column()
  network_kind: string;

  @Column({ nullable: true })
  port_type: string;

  @Column({ nullable: true })
  port_speed: string;

  @Column({ type: "int", default: 1 })
  ports_count: number;

  @Column({ type: "int", default: 8 })
  pcie_lanes: number;

  @Column({ type: "int", default: 8 })
  rear_pcie_lanes: number;

  @Column({ type: "int", default: 1 })
  physical_slots: number;

  @Column({ type: "int", default: 0 })
  ocp_slots: number;

  @Column({ type: "int", nullable: true })
  power_w: number;
}
