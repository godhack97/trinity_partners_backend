import { UserEntity } from "@orm/entities/user.entity";
import {
  Entity,
  Column,
  JoinColumn,
  OneToOne
} from "typeorm";
import { BasisEntity } from "./basis.entity";

export enum NotificationType {
  Site = 'site',
  Email = 'email',
}

@Entity({
  name: "notifications"
})
export class NotificationEntity extends BasisEntity {
  @Column()
  user_id: number;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  title: string;

  @Column()
  text: string;

  @Column({
    type: 'enum',
    enum: ["site", "email"]
  })
  type: "site" | "email";

  @Column({
    default: false,
  })
  is_read: boolean;
}
