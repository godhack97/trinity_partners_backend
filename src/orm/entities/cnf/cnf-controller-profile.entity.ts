import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_controller_profiles" })
export class CnfControllerProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column()
  controller_type: string;

  @Column({ type: "int", default: 8 })
  pcie_lanes: number;

  @Column({ type: "int", default: 8 })
  rear_pcie_lanes: number;

  @Column({ type: "int", default: 1 })
  physical_slots: number;

  @Column({ type: "int", default: 0 })
  internal_ports: number;

  @Column({ default: true })
  supports_sata: boolean;

  @Column({ default: true })
  supports_sas: boolean;

  @Column({ default: false })
  supports_nvme: boolean;

  @Column({ type: "int", nullable: true })
  power_w: number;
}
