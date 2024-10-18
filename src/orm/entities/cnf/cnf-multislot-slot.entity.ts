import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Timestamp, UpdateDateColumn } from "typeorm";

@Entity({ name: 'cnf_multislot_slots' })
export class CnfMultislotSlotEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  slot_id: string;

  @Column()
  multislot_id: string;

  @CreateDateColumn()
  created_at: Timestamp;

  @UpdateDateColumn()
  updated_at: Timestamp;
}