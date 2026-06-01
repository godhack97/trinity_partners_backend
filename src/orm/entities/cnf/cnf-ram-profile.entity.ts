import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_ram_profiles" })
export class CnfRamProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column()
  ram_type: string;

  @Column({ type: "int" })
  capacity_gb: number;

  @Column({ type: "int", nullable: true })
  frequency_mhz: number;

  @Column({ nullable: true })
  rank: string;

  @Column({ nullable: true })
  form_factor: string;
}
