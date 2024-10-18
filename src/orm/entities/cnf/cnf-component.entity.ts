import {
  Column,
  Entity,
  OneToMany,
} from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentSlotEntity } from "./cnf-component-slot.entity";

@Entity({
  name: 'cnf_components',
})
export class CnfComponentEntity extends BasisUUIDEntity {
  constructor() {
    super();
  }

  static $accepted_columns = [
    'id',
    'type_id',
    'price',
    'name',
  ];
  @Column("uuid")
  type_id: string;

  @Column()
  price: number;

  @Column()
  name: string;

  @OneToMany(
    () => CnfComponentSlotEntity,
    (cnfComponentSlotEntity:CnfComponentSlotEntity)=> cnfComponentSlotEntity.component,
    {
      orphanedRowAction: 'delete',
      cascade: ["insert", "update"],

    }
  )
  slots: CnfComponentSlotEntity[];

  static init(data: object) {
    const instance = new this()
    instance._update(instance, CnfComponentEntity, data)
    return instance
  }

  update(data: object) {
    super._update(this, CnfComponentEntity, data)
  }
}
