import { Entity, Column, JoinColumn, OneToOne } from 'typeorm';
import { BasisEntity } from './basis.entity';
import { UserEntity } from './user.entity';

@Entity({
  name: 'users_info',
})
export class UserInfo extends BasisEntity {
  @Column()
  user_id: number;

  @OneToOne(() => UserEntity, (user: UserEntity) => user.id, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  company_name: string;

  @Column()
  job_title: string;

  @Column()
  phone: string;
}
