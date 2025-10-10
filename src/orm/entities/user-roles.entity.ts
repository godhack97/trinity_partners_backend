import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { UserEntity } from "./user.entity";
import { RoleEntity } from "./role.entity";

@Entity({
  name: "user_roles",
})
export class UserRoleEntity {
  @PrimaryColumn({ name: "user_id" })
  user_id: number;

  @PrimaryColumn({ name: "role_id" })
  role_id: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @ManyToOne(() => UserEntity, (user) => user.user_roles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @ManyToOne(() => RoleEntity, (role) => role.user_roles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "role_id" })
  role: RoleEntity;
}