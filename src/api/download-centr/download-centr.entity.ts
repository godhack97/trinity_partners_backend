import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('download_centr')
export class DownloadCentr {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 500, nullable: true })
  tags: string;

  @Column({ length: 500, name: 'file_path' })
  filePath: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}