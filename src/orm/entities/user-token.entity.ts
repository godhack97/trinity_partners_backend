import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
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

  @CreateDateColumn({ name: "created_at", type: "timestamp", nullable: true })
  created_at: Date | null;

  @Column({ name: "expires_at", type: "timestamp" })
  expires_at: Date;

  @Column({ name: "revoked_at", type: "timestamp", nullable: true })
  revoked_at: Date | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;
}
