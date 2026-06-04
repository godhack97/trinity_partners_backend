import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_drive_profiles" })
export class CnfDriveProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column()
  drive_type: string;

  @Column({ nullable: true })
  interface_type: string;

  @Column({ nullable: true })
  media_kind: string;

  @Column()
  form_factor: string;

  @Column({ type: "int" })
  capacity_gb: number;

  @Column({ nullable: true })
  speed_class: string;

  @Column({ nullable: true })
  workload_class: string;

  @Column({ type: "int", default: 0 })
  pcie_lanes: number;

  @Column({ type: "int", nullable: true })
  power_w: number;
}
