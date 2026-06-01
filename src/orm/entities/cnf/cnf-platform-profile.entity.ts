import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfServerEntity } from "./cnf-server.entity";

@Entity({ name: "cnf_platform_profiles" })
export class CnfPlatformProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  server_id: string;

  @OneToOne(() => CnfServerEntity)
  @JoinColumn({ name: "server_id" })
  server: CnfServerEntity;

  @Column()
  platform_code: string;

  @Column()
  family: string;

  @Column({ default: "standard" })
  mode: string;

  @Column({ type: "int", default: 2 })
  cpu_limit: number;

  @Column({ default: "DDR5" })
  ram_type: string;

  @Column({ nullable: true })
  pcie_generation: string;

  @Column({ type: "int", default: 80 })
  pcie_lanes_per_cpu: number;

  @Column({ type: "int", default: 160 })
  pcie_lanes_total: number;

  @Column({ type: "int", default: 96 })
  rear_pcie_ocp_limit: number;

  @Column({ type: "int", default: 6 })
  pcie_slots: number;

  @Column({ type: "int", default: 1 })
  ocp_slots: number;

  @Column({ type: "int", default: 360 })
  base_power_w: number;

  @Column({ type: "int", default: 0 })
  direct_sata_limit: number;

  @Column({ type: "int", default: 0 })
  internal_m2_bays: number;

  @Column({ default: true })
  is_active: boolean;
}
