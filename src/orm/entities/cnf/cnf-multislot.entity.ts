import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Timestamp,
  UpdateDateColumn,
} from "typeorm";
import { CnfServerMultislotEntity } from "./cnf-server-multislot.entity";

@Entity({
  name: "cnf_multislots",
  orderBy: {
    name: "ASC",
  },
})
export class CnfMultislotEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  server_multislot: CnfServerMultislotEntity;

  multislot_slots: CnfMultislotEntity;

  @CreateDateColumn()
  created_at: Timestamp;

  @UpdateDateColumn()
  updated_at: Timestamp;
}
