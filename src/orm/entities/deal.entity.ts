import {  Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CustomerEntity, DistributorEntity, UserEntity } from ".";
import { DeleteDateColumn } from 'typeorm';


export enum DealStatus {
  Registered = 'registered',
  Canceled = 'canceled',
  Moderation = 'moderation',
  Win = 'win',
  Lose = 'loose'
}

export const DealStatusRu = {
  registered: 'зарегистрирована',
  canceled: 'не зарегистрирована',
  moderation: "на рассмотрении",
  win: 'выиграна',
  loose: 'проиграла'
};

export enum Bitrix24SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced', 
  FAILED = 'failed'
}

@Entity({
  name: "deals",
  orderBy: {
    id: "DESC"
  }
})
export class DealEntity extends BasisEntity {

  @Column()
  deal_num: string;

  @Column({ 
    name: 'bitrix24_deal_id', 
    type: 'int', 
    unsigned: true, 
    nullable: true,
    comment: 'ID сделки в Bitrix24'
  })
  bitrix24_deal_id?: number;

  @Column({ 
    name: 'bitrix24_sync_status',
    type: 'enum',
    enum: Bitrix24SyncStatus,
    default: Bitrix24SyncStatus.PENDING,
    comment: 'Статус синхронизации с Bitrix24'
  })
  bitrix24_sync_status: Bitrix24SyncStatus

  @Column({ 
    name: 'bitrix24_synced_at',
    type: 'timestamp',
    nullable: true,
    comment: 'Время последней синхронизации с Bitrix24'
  })
  bitrix24_synced_at?: Date;

  @Column()
  distributor_id: number;

  @ManyToOne(()=> DistributorEntity, (distributor:  DistributorEntity)=> distributor.id, { eager: true })
  @JoinColumn({ name: "distributor_id" })
  distributor:  DistributorEntity

  @Column()
  customer_id: number;

  @ManyToOne(()=> CustomerEntity, (customer: CustomerEntity)=> customer.id, { eager: true })
  @JoinColumn({ name: "customer_id" })
  customer: CustomerEntity

  @Column()
  creator_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "creator_id" })
  partner: UserEntity;

  @Column({ nullable: true }) 
  title?: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  deal_sum: number;

  @Column()
  competition_link: string;

  @Column()
  configuration_link: string;

  @Column()
  purchase_date: Date;

  @Column()
  comment: string;

  @Column({
    type: "enum",
    enum: DealStatus,
    default: DealStatus.Moderation
  })
  status: DealStatus;

  @Column({ nullable: true, type: "varchar"})
  special_discount: string;

  @Column({ nullable: true, type: "decimal", precision: 10, scale: 2 })
  special_price: number;

  @Column({ nullable: true })
  discount_date: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
