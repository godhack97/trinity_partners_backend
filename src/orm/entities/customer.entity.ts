import { Column, Entity } from "typeorm";
import { BasisEntity } from "./basis.entity";


@Entity({
  name: "customers"
})
export class CustomerEntity extends BasisEntity {

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  inn: string;

  @Column()
  company_name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;
}