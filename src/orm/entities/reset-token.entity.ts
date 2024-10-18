import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from './user.entity';
import { BasisEntity } from './basis.entity';

@Entity({
  name: 'reset_tokens',
})
export class ResetTokenEntity extends BasisEntity {
  @Column()
  user_id: number;

  @ManyToOne(() => UserEntity, (user: UserEntity) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column()
  token: string;

  @Column()
  expire_date?: Date;
}
