import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfPlatformProfileEntity } from "./cnf-platform-profile.entity";

@Entity({ name: "cnf_platform_forbidden_component_types" })
export class CnfPlatformForbiddenComponentTypeEntity extends BasisUUIDEntity {
  @Column("uuid")
  platform_profile_id: string;

  @ManyToOne(() => CnfPlatformProfileEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "platform_profile_id" })
  platform_profile: CnfPlatformProfileEntity;

  @Column()
  component_type_key: string;

  @Column({ type: "text", nullable: true })
  reason: string;
}
