import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum LegalPolicyType {
  Cookie = "cookie_policy",
  Privacy152Fz = "privacy_152fz",
  UserAgreement = "user_agreement",
  FederalLaw44Fz = "federal_law_44fz",
  FederalLaw223Fz = "federal_law_223fz",
  FederalLaw275Fz = "federal_law_275fz",
}

@Entity("legal_consents")
@Index("idx_legal_consents_user_policy", ["user_id", "policy_type", "accepted_at"])
export class LegalConsentEntity {
  @PrimaryGeneratedColumn({ type: "bigint", unsigned: true })
  id: string;

  @Column({ type: "int", unsigned: true, nullable: true })
  user_id: number | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  session_hash: string | null;

  @Column({ type: "varchar", length: 64 })
  policy_type: LegalPolicyType;

  @Column({ type: "varchar", length: 64 })
  policy_version: string;

  @Column({ type: "tinyint", width: 1, default: 1 })
  accepted: boolean;

  @CreateDateColumn({ type: "timestamp", name: "accepted_at" })
  accepted_at: Date;

  @Column({ type: "varchar", length: 64 })
  source: string;

  @Column({ type: "char", length: 64, nullable: true })
  ip_hash: string | null;

  @Column({ type: "char", length: 64, nullable: true })
  user_agent_hash: string | null;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, unknown> | null;
}

