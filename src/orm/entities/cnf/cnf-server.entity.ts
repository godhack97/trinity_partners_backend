import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn, ManyToOne, OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Timestamp,
  UpdateDateColumn
} from "typeorm";
import { CnfServerboxHeightEntity } from './cnf-serverbox-height.entity';
import { CnfServerSlotEntity } from "./cnf-server-slot.entity";
import { CnfServerMultislotEntity } from "./cnf-server-multislot.entity";
import { CnfServerGeneration } from "./cnf-server-generation.entity";

@Entity({
  name: 'cnf_servers',
})
export class CnfServerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @OneToOne(
    () => CnfServerboxHeightEntity,
    (serverbox_height: CnfServerboxHeightEntity) => serverbox_height.id,
  )
  @JoinColumn({ name: 'serverbox_height_id' })
  serverbox_height: CnfServerboxHeightEntity;

  @Column()
  serverbox_height_id: string;

  @ManyToOne(
    () => CnfServerGeneration,
    (server_generation: CnfServerGeneration) => server_generation.id,
  )
  @JoinColumn({ name: 'server_generation_id' })
  server_generation: CnfServerGeneration;

  @Column({nullable: true})
  server_generation_id: string;

  @Column()
  price: number;

  @Column({nullable: true})
  image: string;

  @Column({nullable: true})
  guide: string;

  @Column({nullable: true})
  cert: string;

  @CreateDateColumn()
  created_at: Timestamp;

  @UpdateDateColumn()
  updated_at: Timestamp;

  @OneToMany(() => CnfServerSlotEntity, (serverslot) => serverslot.server, {eager: true})
  slots: [CnfServerSlotEntity];

  @OneToMany(() => CnfServerMultislotEntity, ( sms ) => sms.server, {eager: true})
  multislots: [CnfServerMultislotEntity];
}
