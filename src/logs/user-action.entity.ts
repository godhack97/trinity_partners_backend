import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "@orm/entities";

@Entity("user_actions")
export class UserAction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column({ name: "user_id", nullable: true })
  user_id: number;

  @Column()
  action: string;

  @Column({ type: "json", default: {} })
  details: object;

  @CreateDateColumn({ name: "created_at", nullable: false })
  created_at: Date;
}
