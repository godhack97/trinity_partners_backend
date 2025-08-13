import { UserEntity } from "@orm/entities/user.entity";
import { Entity, Column, JoinColumn, OneToOne } from "typeorm";
import { BasisEntity } from "./basis.entity";

export enum NotificationType {
  Site = "site",
  Email = "email",
}

export enum NotificationIconType {
  BELL = "bell", // КОЛОКОЛЬЧИК
  HORN = "horn", // РУПОР
  SHIELD = "shield", //ЩИТ
}

@Entity({
  name: "notifications",
  orderBy: {
    id: "DESC",
  },
})
export class NotificationEntity extends BasisEntity {
  @Column()
  user_id: number;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column()
  title: string;

  @Column()
  text: string;

  @Column({
    type: "enum",
    enum: ["site", "email"],
  })
  type: "site" | "email";

  @Column({
    default: false,
  })
  is_read: boolean;

  @Column({
    type: "enum",
    enum: NotificationIconType,
    default: NotificationIconType.BELL,
  })
  icon: NotificationIconType;

  @Column({ type: "timestamp" })
  read_at: Date;
}
