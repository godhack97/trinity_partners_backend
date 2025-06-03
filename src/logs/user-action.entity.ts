import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('user_actions')
export class UserAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column()
  action: string;

  // Исправь здесь:
  @Column({ type: 'json', default: {} })
  details: object;

  @CreateDateColumn({ name: 'created_at', nullable: false})
  createdAt: Date;
}
