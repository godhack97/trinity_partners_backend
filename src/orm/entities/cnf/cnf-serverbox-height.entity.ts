import { BasisEntity } from 'src/orm/entities/basis.entity';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Timestamp, UpdateDateColumn } from "typeorm";
import { UUID } from "typeorm/driver/mongodb/bson.typings";

@Entity({
  name: 'cnf_serverbox_height',
})
export class CnfServerboxHeightEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  created_at: Timestamp;

  @UpdateDateColumn()
  updated_at: Timestamp;
}
