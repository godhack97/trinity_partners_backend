import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { RoleEntity } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  display_name?: string;

  @Column({ 
    type: 'enum', 
    enum: ['api', 'menu', 'system'] 
  })
  resource_type: 'api' | 'menu' | 'system';

  @Column({ type: 'varchar', length: 255 })
  resource_name: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToMany(() => RoleEntity, role => role.permissions)
  roles: RoleEntity[];
}