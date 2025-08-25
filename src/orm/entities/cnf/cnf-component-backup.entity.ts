import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cnf_component_backups')
export class CnfComponentBackup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  created_by: string;

  @Column({ type: 'int' })
  components_count: number;
}