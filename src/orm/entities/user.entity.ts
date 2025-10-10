import { UserSettingEntity } from "@orm/entities/user-setting.entity";
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { RoleEntity } from "./role.entity";
import { BasisEntity } from "./basis.entity";
import { CompanyEmployeeEntity } from "./company-employee.entity";
import { CompanyEntity } from "@orm/entities/company.entity";
import { UserInfoEntity } from "@orm/entities/user-info.entity";
import { UserRoleEntity } from "./user-roles.entity";

@Entity({
  name: "users",
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

  @Column({ nullable: true })
  manager_id: number;

  @OneToOne(
    () => CompanyEmployeeEntity,
    (CompanyEmployee) => CompanyEmployee.employee,
  )
  company_employee: CompanyEmployeeEntity;

  @OneToOne(() => UserInfoEntity, (userInfo: UserInfoEntity) => userInfo.user)
  user_info: UserInfoEntity;

  @ManyToOne(() => RoleEntity, (role: RoleEntity) => role.id, { eager: true })
  @JoinColumn({ name: "role_id" })
  role: RoleEntity;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
  user_roles: UserRoleEntity[];

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "manager_id" })
  manager: UserEntity;

  @OneToMany(() => UserEntity, (user: UserEntity) => user.manager)
  managed_users: UserEntity[];

  @Column({ default: false })
  email_confirmed: boolean;

  @DeleteDateColumn()
  deleted_at: Date;

  @OneToOne(() => CompanyEntity, (company) => company.owner)
  lazy_owner_company: Promise<CompanyEntity>;
  owner_company: CompanyEntity;

  @OneToMany(
    () => UserSettingEntity,
    (settings: UserSettingEntity) => settings.user,
  )
  user_settings: UserSettingEntity[];

  @Column({
    name: "bitrix24_contact_id",
    type: "int",
    unsigned: true,
    nullable: true,
    comment: "ID контакта в Bitrix24",
  })
  bitrix24_contact_id?: number;

  @Column({
    name: "bitrix24_sync_status",
    type: "enum",
    enum: ["pending", "synced", "failed"],
    default: "pending",
    comment: "Статус синхронизации контакта с Bitrix24",
  })
  bitrix24_sync_status?: string;

  @Column({
    name: "bitrix24_synced_at",
    type: "timestamp",
    nullable: true,
    comment: "Время последней синхронизации контакта с Bitrix24",
  })
  bitrix24_synced_at?: Date;

  @Column({ type: "json", nullable: true })
  lastActivity: {
    lastSeen: Date;
    ip: string;
    browser: string;
    device: string;
    os: string;
  } | null;

  get roles(): RoleEntity[] {
    if (this.user_roles && this.user_roles.length > 0) {
      return this.user_roles.map(ur => ur.role);
    }
    return this.role ? [this.role] : [];
  }
}