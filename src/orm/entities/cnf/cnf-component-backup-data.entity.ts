import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('cnf_component_backup_data')
export class CnfComponentBackupData {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  backup_id: string;

  @Column({ type: 'json' })
  component_data: any;
}