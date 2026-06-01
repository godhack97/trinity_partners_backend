import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_transceiver_profiles" })
export class CnfTransceiverProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column()
  interface_type: string;

  @Column({ nullable: true })
  speed: string;

  @Column({ nullable: true })
  media_type: string;

  @Column({ nullable: true })
  wavelength: string;

  @Column({ nullable: true })
  compatible_port_type: string;
}
