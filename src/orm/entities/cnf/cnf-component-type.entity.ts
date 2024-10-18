import { BasisEntity } from 'src/orm/entities/basis.entity';
import { Column, Entity } from 'typeorm';

@Entity({
  name: 'cnf_component_types',
})
export class CnfComponentTypeEntity extends BasisEntity {
  @Column()
  name: string;
}
