import { Column, Entity } from "typeorm";
import { BasisUUIDEntity } from "../basis.entity";

@Entity(
  {name: 'cnf_server_generation'}
)
export class CnfServerGeneration extends BasisUUIDEntity {
  @Column()
  name: string;
}