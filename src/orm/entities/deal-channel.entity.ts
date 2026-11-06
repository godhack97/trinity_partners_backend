import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { DealEntity } from "./deal.entity";

export enum DealChannelType {
  VendorDistributor = "vendor_distributor",
  VendorPartner = "vendor_partner",
  PartnerDistributor = "partner_distributor",
  General = "general",
}

@Entity({ name: "deal_channels" })
@Index("IDX_deal_channels_deal", ["deal_id"])
export class DealChannelEntity extends BasisEntity {
  @Column({ type: "int" })
  deal_id: number;

  @ManyToOne(() => DealEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "deal_id" })
  deal?: DealEntity;

  @Column({ type: "enum", enum: DealChannelType })
  channel_type: DealChannelType;

  @Column({ type: "int", nullable: true })
  first_company_id?: number | null;

  @Column({ type: "int", nullable: true })
  second_company_id?: number | null;

  @Column({ type: "datetime", nullable: true })
  archived_at?: Date | null;
}
