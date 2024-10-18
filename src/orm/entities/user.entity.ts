import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn, OneToOne
} from "typeorm";
import { RoleEntity } from "./role.entity";
import { BasisEntity } from "./basis.entity";
import { CompanyEmployeeEntity } from "./company-employee.entity";

@Entity({
  name: "users"
})
export class UserEntity extends BasisEntity {
  @Column()
  password: string;

  @Column()
  salt: string;

  @Column()
  email: string;

  @Column({ default: false })
  is_activated: boolean;

  @Column()
  role_id: number;

  @OneToOne(() => CompanyEmployeeEntity, (CompanyEmployee) => CompanyEmployee.employee)
  company_employee: CompanyEmployeeEntity;

  @ManyToOne(() => RoleEntity, (role: RoleEntity) => role.id, {eager: true})
  @JoinColumn({ name: "role_id" })
  role: RoleEntity;

  @Column({ default: false })
  email_confirmed: boolean;

  @Column()
  token: string;

  @DeleteDateColumn()
  deleted_at: Date;

  @Column()
  phone: string;
}
