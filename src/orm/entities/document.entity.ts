import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { DocumentGroupEntity } from './document-group.entity';
import { DocumentAccessLevelEntity } from './document-access-level.entity';
import { DocumentTagEntity } from './document-tag.entity';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, name: 'group_id' })
  group_id: number | null;

  @ManyToOne(() => DocumentGroupEntity, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'group_id' })
  group: DocumentGroupEntity | null;

  @Column({ nullable: true, name: 'access_level_id' })
  access_level_id: number | null;

  @ManyToOne(() => DocumentAccessLevelEntity, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'access_level_id' })
  access_level: DocumentAccessLevelEntity | null;

  @ManyToMany(() => DocumentTagEntity, { eager: true })
  @JoinTable({
    name: 'document_tag_relations',
    joinColumn: { name: 'document_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: DocumentTagEntity[];

  @Column({ length: 500, name: 'file_path' })
  filePath: string;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
