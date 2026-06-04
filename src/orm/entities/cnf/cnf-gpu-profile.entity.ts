import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_gpu_profiles" })
export class CnfGpuProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column({ type: "int", default: 16 })
  pcie_lanes: number;

  @Column({ type: "int", default: 16 })
  rear_pcie_lanes: number;

  @Column({ type: "int", default: 2 })
  physical_slots: number;

  @Column({ type: "int", nullable: true })
  memory_gb: number;

  @Column({ type: "int", nullable: true })
  power_w: number;
}
