import { Entity, Column, JoinColumn, OneToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";
import { UserEntity } from "./user.entity";

export const UserSettingType = {
  NOTIFICATIONS_WEB: "notifications_web",
  NOTIFICATIONS_EMAIL: "notifications_email",
  THEME: "theme",
};
export const UserNotificationType = {
  Yes: "true",
  No: "false",
};
export const UserThemeType = {
  Dark: "dark",
  White: "white",
  System: "system",
};

export const UserSettingDefaultValues = {
  notifications_web: UserNotificationType.No,
  notifications_email: UserNotificationType.No,
  theme: UserThemeType.System,
};
@Entity({
  name: "user_settings",
})
export class UserSettingEntity extends BasisEntity {
  @Column()
  user_id: number;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column({
    type: "enum",
    enum: UserSettingType,
  })
  type: string;

  @Column()
  value: string;
}
