import { BasisEntity } from 'src/orm/entities/basis.entity';
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { CnfComponentEntity } from "./cnf-component.entity";

@Entity({
  name: 'cnf_component_slots',
})
export class CnfComponentSlotEntity extends BasisEntity {
  constructor() {
    super();
  }

  static $accepted_columns = [
    'id',
    'component_id',
    'slot_id',
    'amount',
    'increase',
  ];
  @Column("uuid")
  component_id: string;

  @Column("uuid")
  slot_id: string;

  @Column()
  amount: number;

  @Column()
  increase: boolean;

  @ManyToOne(
    () => CnfComponentEntity,
    (cnfComponentEntity: CnfComponentEntity) => cnfComponentEntity.slots,
    {
      onUpdate: "CASCADE",
      orphanedRowAction: 'delete',
    }
  )
  @JoinColumn({ name: "component_id" })
  component: CnfComponentEntity;

  static init(data: object) {
    const instance = new this()
    instance._update(instance, CnfComponentSlotEntity, data)
    return instance
  }

  update(data: object) {
    super._update(this, CnfComponentSlotEntity, data)
  }
}
