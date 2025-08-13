import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

@Entity("user_tokens")
export class UserToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  user_id: number;

  @Column()
  client_id: string;

  @Column()
  token: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
