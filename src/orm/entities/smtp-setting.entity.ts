import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("smtp_settings")
export class SmtpSettingEntity {
  @PrimaryColumn({ type: "tinyint", unsigned: true })
  id: number;

  @Column({ type: "varchar", length: 255 })
  host: string;

  @Column({ type: "int", unsigned: true })
  port: number;

  @Column({ type: "boolean", default: false })
  secure: boolean;

  @Column({ type: "varchar", length: 255 })
  username: string;

  @Column({ name: "password_encrypted", type: "text" })
  passwordEncrypted: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
