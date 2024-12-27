import {  Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { CustomerEntity, DistributorEntity, UserEntity } from ".";


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
  Moderation: "на рассмотрении",
  win: 'выиграна',
  loose: 'проиграла'
}
@Entity({
  name: "deals"
})
export class DealEntity extends BasisEntity {

  @Column()
  deal_num: string;

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
  partner_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: "partner_id" })
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

}
