import { Column, Entity, } from "typeorm";
import { BasisUUIDEntity } from "@orm/entities/basis.entity";

@Entity({
  name: 'cnf_slots',
  orderBy: {
    name: "ASC"
  }
})
export class CnfSlotEntity extends BasisUUIDEntity{
  @Column()
  name: string;

  @Column({ nullable: true })
  type_id: string;
}
