import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Timestamp, UpdateDateColumn } from "typeorm";
import { CnfServerEntity } from "./cnf-server.entity";

@Entity({ name: 'cnf_server_multislots' })
export class CnfServerMultislotEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  server_id: string;

  @Column()
  multislot_id: string;

  @Column()
  amount: number;

  @Column()
  on_back_panel: boolean;

  @CreateDateColumn()
  created_at: Timestamp;

  @UpdateDateColumn()
  updated_at: Timestamp;

  @ManyToOne(() => CnfServerEntity, (server) => server.multislots)
  @JoinColumn({ name: "server_id" })
  server: CnfServerEntity;

}