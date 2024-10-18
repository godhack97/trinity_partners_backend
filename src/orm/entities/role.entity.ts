import { Column, Entity } from 'typeorm';
import { BasisEntity } from './basis.entity';

@Entity({
  name: 'roles',
})
export class RoleEntity extends BasisEntity {
  @Column()
  name: string;

  @Column()
  description: string;
}
