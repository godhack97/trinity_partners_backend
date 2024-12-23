import { UserEntity } from "@orm/entities/user.entity";
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  OneToOne
} from "typeorm";
import { BasisEntity } from "./basis.entity";

@Entity({
  name: "notifications"
})
export class NotificationEntity extends BasisEntity {
  @OneToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  title: string;

  @Column()
  text: string;

  @Column()
  type: string;

  @DeleteDateColumn()
  deleted_at: Date;
}
