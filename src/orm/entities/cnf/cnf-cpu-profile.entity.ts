import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_cpu_profiles" })
export class CnfCpuProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column({ nullable: true })
  socket_profile: string;

  @Column()
  ram_type: string;

  @Column({ type: "int", nullable: true })
  tdp_w: number;

  @Column({ type: "int", default: 8 })
  memory_channels: number;

  @Column({ type: "int", default: 16 })
  max_ram_modules_per_cpu: number;

  @Column({ type: "int", nullable: true })
  max_ram_gb_per_cpu: number;

  @Column({ type: "int", nullable: true })
  memory_speed_1dpc: number;

  @Column({ type: "int", nullable: true })
  memory_speed_2dpc: number;
}
