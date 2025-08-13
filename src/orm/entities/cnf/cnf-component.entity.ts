import { Column, Entity, OneToMany } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";
import { CnfComponentSlotEntity } from "./cnf-component-slot.entity";

@Entity({
  name: "cnf_components",
  orderBy: {
    name: "ASC",
  },
})
export class CnfComponentEntity extends BasisUUIDEntity {
  constructor() {
    super();
  }

  static $accepted_columns = [
    "id",
    "type_id",
    "subtype",
    "price",
    "name",
    "server_generation_id",
    "processor_generation_id",
  ];

  @Column("uuid")
  type_id: string;

  @Column()
  subtype: string;

  @Column()
  price: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  server_generation_id: string;

  @Column({ nullable: true })
  processor_generation_id: string;

  @OneToMany(
    () => CnfComponentSlotEntity,
    (cnfComponentSlotEntity: CnfComponentSlotEntity) =>
      cnfComponentSlotEntity.component,
    {
      orphanedRowAction: "delete",
      cascade: ["insert", "update"],
    },
  )
  slots: CnfComponentSlotEntity[];

  static init(data: object) {
    const instance = new this();
    instance._update(instance, CnfComponentEntity, data);
    return instance;
  }

  update(data: object) {
    super._update(this, CnfComponentEntity, data);
  }
}
