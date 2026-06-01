import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfPlatformProfileEntity } from "./cnf-platform-profile.entity";

@Entity({ name: "cnf_platform_bays" })
export class CnfPlatformBayEntity extends BasisUUIDEntity {
  @Column("uuid")
  platform_profile_id: string;

  @ManyToOne(() => CnfPlatformProfileEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "platform_profile_id" })
  platform_profile: CnfPlatformProfileEntity;

  @Column()
  placement: string;

  @Column()
  bay_kind: string;

  @Column()
  form_factor: string;

  @Column({ type: "int" })
  capacity: number;

  @Column({ type: "json" })
  allowed_drive_types: string[];

  @Column({ type: "int", nullable: true })
  pcie_lanes_per_nvme: number;

  @Column({ default: false })
  counts_to_rear_pcie: boolean;
}
