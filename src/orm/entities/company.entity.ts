import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
} from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";

export enum CompanyStatus {
  Pending = "pending",
  Accept = "accept",
  Reject = "reject",
}

@Entity({
  name: "companies",
})
export class CompanyEntity extends BasisEntity {
  @Column()
  inn: string;

  @Column()
  owner_id: number;

  @Column()
  name: string;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "owner_id" })
  owner: UserEntity;

  @ManyToMany(() => UserEntity)
  @JoinTable({
    name: "company_employees",
    joinColumn: {
      // name: 'employee_id',
      // referencedColumnName: 'id',
      name: "company_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      // name: 'company_id',
      // referencedColumnName: 'id',
      name: "employee_id",
      referencedColumnName: "id",
    },
  })
  employee: UserEntity[];

  @Column()
  company_business_line: string;

  @Column()
  employees_count: number;

  @Column()
  site_url: string;

  @Column()
  promoted_products: string;

  @Column()
  products_of_interest: string;

  @Column()
  main_customers: string;

  @Column({
    type: "enum",
    enum: CompanyStatus,
    default: CompanyStatus.Pending,
  })
  status: CompanyStatus;
}
