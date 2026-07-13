import { Column, Entity } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";

@Entity({ name: "cnf_transceiver_compatibility_rules" })
export class CnfTransceiverCompatibilityRuleEntity extends BasisUUIDEntity {
  @Column({ nullable: true })
  network_connector_type: string;

  @Column({ type: "float", nullable: true })
  network_speed_gbps: number;

  @Column({ nullable: true })
  transceiver_connector_type: string;

  @Column({ type: "float", nullable: true })
  transceiver_speed_gbps: number;

  @Column({ type: "tinyint", default: 1 })
  is_allowed: boolean;

  @Column({ nullable: true })
  note: string;
}
