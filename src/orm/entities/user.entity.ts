import { UserSettingEntity } from "@orm/entities/user-setting.entity";
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  OneToOne,
  OneToMany
} from "typeorm";
import { RoleEntity } from "./role.entity";
import { BasisEntity } from "./basis.entity";
import { CompanyEmployeeEntity } from "./company-employee.entity";
import { CompanyEntity } from "@orm/entities/company.entity";
import { UserInfoEntity } from "@orm/entities/user-info.entity";

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

  @OneToOne(() => UserInfoEntity, (userInfo: UserInfoEntity) => userInfo.user) // Добавляем связь с UserInfoEntity
  user_info: UserInfoEntity;

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

  @OneToOne(() => CompanyEntity, (company) => company.owner)
  lazy_owner_company: Promise<CompanyEntity>;
  owner_company: CompanyEntity;
  
  @OneToOne(() => UserInfoEntity, (info) => info.user, { eager: true })
  info: UserInfoEntity

  @OneToMany(() => UserSettingEntity, (settings: UserSettingEntity) => settings.user)
  user_settings: UserSettingEntity[];
}
