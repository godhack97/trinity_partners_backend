import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('user_table_settings')
@Index(['userId'], { unique: false })
@Index(['userId', 'tableId'], { unique: true })
export class UserTableSettingsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @Column({ name: 'table_id', type: 'varchar', length: '255' })
  tableId: string;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to(value: string[] | null): string | null {
        return value ? JSON.stringify(value) : null;
      },
      from(value: string | null): string[] | null {
        return value ? JSON.parse(value) : null;
      },
    },
  })
  data: string[] | null;
}