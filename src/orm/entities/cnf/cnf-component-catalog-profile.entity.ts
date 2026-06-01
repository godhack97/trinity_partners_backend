import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({ name: "cnf_component_catalog_profiles" })
export class CnfComponentCatalogProfileEntity extends BasisUUIDEntity {
  @Column("uuid")
  component_id: string;

  @OneToOne(() => CnfComponentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  @Column()
  component_type_key: string;

  @Column({ nullable: true })
  part_number: string;

  @Column({ nullable: true })
  vendor: string;

  @Column({ default: "full" })
  client_display_mode: string;

  @Column({ nullable: true })
  generation_key: string;

  @Column({ type: "uuid", nullable: true })
  server_generation_id: string;

  @Column({ type: "uuid", nullable: true })
  processor_generation_id: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "text", nullable: true })
  disabled_reason: string;

  @Column({ nullable: true })
  s4b_status: string;
}
