import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { UserEntity as User } from './user.entity';
import { Permission } from './permission.entity';
import { UserRoleEntity } from './user-roles.entity';

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at?: Date;

  @OneToMany(() => User, user => user.role)
  users: User[];

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.role)
  user_roles: UserRoleEntity[];

  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id' },
    inverseJoinColumn: { name: 'permission_id' }
  })
  permissions: Permission[];
}